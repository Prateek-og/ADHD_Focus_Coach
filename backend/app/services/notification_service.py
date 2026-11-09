"""Create, schedule, dispatch and fetch task notifications."""

import logging
from datetime import datetime

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.device import Device
from app.models.notification import (
    Notification,
    NotificationStatus,
    NotificationType,
)
from app.models.task import Task
from app.models.child import Child
from app.models.user import User, UserRole
from app.workers.queue import schedule_notification, cancel_notification_job

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
DEVICE_NOT_REGISTERED = "DeviceNotRegistered"


class NotificationService:
    # ---------------------------------------------------------
    # Expo push notification
    # ---------------------------------------------------------

    @staticmethod
    def _send_push_notification_result(
        expo_push_token: str,
        title: str,
        message: str,
    ) -> tuple[bool, bool]:
        """
        Return (sent, token_is_invalid).

        Expo's DeviceNotRegistered response means this token should no
        longer be used. Other errors do not automatically deactivate it.
        """
        payload = {
            "to": expo_push_token,
            "title": title,
            "body": message,
            "sound": "default",
        }

        try:
            response = httpx.post(
                EXPO_PUSH_URL,
                json=payload,
                timeout=10.0,
            )
            response.raise_for_status()
            result = response.json()
        except (httpx.HTTPError, ValueError):
            logger.exception("Failed to send Expo notification")
            return False, False

        ticket = result.get("data")
        if isinstance(ticket, list):
            ticket = ticket[0] if ticket else None

        if ticket and ticket.get("status") == "ok":
            return True, False

        details = ticket.get("details") if isinstance(ticket, dict) else {}
        error = details.get("error") if isinstance(details, dict) else None

        if error == DEVICE_NOT_REGISTERED:
            logger.info("Expo token is no longer registered; deactivating it")
            return False, True

        logger.error("Expo rejected push notification: %s", result)
        return False, False

    @staticmethod
    def send_push_notification(
        expo_push_token: str,
        title: str,
        message: str,
    ) -> bool:
        """Compatibility wrapper for callers needing a simple success flag."""
        sent, _ = NotificationService._send_push_notification_result(
            expo_push_token,
            title,
            message,
        )
        return sent

    @staticmethod
    def send_to_user_devices(
        db: Session,
        user_id: int,
        title: str,
        message: str,
    ) -> int:
        """Send to every active device registered to a user.

        Returns the number of devices for which Expo accepted the message.
        Invalid Expo tokens are deactivated in the Device table.
        """
        devices = db.execute(
            select(Device).where(
                Device.user_id == user_id,
                Device.is_active.is_(True),
            )
        ).scalars().all()

        if not devices:
            logger.warning("No active devices for notification recipient %s", user_id)
            return 0

        sent_count = 0
        for device in devices:
            sent, invalid_token = NotificationService._send_push_notification_result(
                device.expo_push_token,
                title,
                message,
            )

            if sent:
                sent_count += 1
            elif invalid_token:
                device.is_active = False

        if any(not device.is_active for device in devices):
            db.commit()

        return sent_count

    @staticmethod
    def dispatch_notification(
        db: Session,
        notification: Notification,
    ) -> bool:
        """Dispatch one pending notification to all active recipient devices."""
        sent_count = NotificationService.send_to_user_devices(
            db,
            notification.user_id,
            "Task Reminder",
            notification.message,
        )

        if sent_count > 0:
            notification.status = NotificationStatus.SENT
            db.commit()
            return True

        # Preserve PENDING when no device accepted the notification. This lets
        # the manual fallback retry it after a device is registered or repaired.
        return False

    # ---------------------------------------------------------
    # Manual dispatch fallback
    # ---------------------------------------------------------

    @staticmethod
    def dispatch_due_notifications(
        db: Session,
        batch_size: int = 50,
    ) -> int:
        """Dispatch due pending notifications; RQ is the normal scheduler."""
        now = datetime.utcnow()

        notifications = db.execute(
            select(Notification)
            .where(
                Notification.status == NotificationStatus.PENDING,
                Notification.scheduled_at <= now,
            )
            .order_by(Notification.scheduled_at.asc())
            .limit(batch_size)
        ).scalars().all()

        sent_count = 0
        for notification in notifications:
            if NotificationService.dispatch_notification(db, notification):
                sent_count += 1

        return sent_count

    # ---------------------------------------------------------
    # Create task reminder
    # ---------------------------------------------------------

    @staticmethod
    def create_task_reminder(
        db: Session,
        task: Task,
        child: Child,
    ) -> Notification | None:
        """Create and schedule a task reminder."""
        if not task.scheduled_at:
            return None

        target_user_id = child.user_id or child.caregiver_id

        notification = Notification(
            user_id=target_user_id,
            child_id=child.id,
            task_id=task.id,
            type=NotificationType.TASK_REMINDER,
            message=(
                f"Reminder: '{task.title}' is scheduled for "
                f"{task.scheduled_at.strftime('%H:%M')}"
            ),
            scheduled_at=task.scheduled_at,
            status=NotificationStatus.PENDING,
        )

        db.add(notification)
        db.commit()
        db.refresh(notification)

        try:
            schedule_notification(notification.id, notification.scheduled_at)
        except Exception:
            logger.exception(
                "Failed to schedule notification %s",
                notification.id,
            )

        return notification

    # ---------------------------------------------------------
    # Update task reminder
    # ---------------------------------------------------------

    @staticmethod
    def update_task_reminder(
        db: Session,
        task: Task,
        child: Child,
    ) -> None:
        """Update, reschedule or cancel a task reminder."""
        pending_notifs = db.execute(
            select(Notification).where(
                Notification.task_id == task.id,
                Notification.status == NotificationStatus.PENDING,
            )
        ).scalars().all()

        if task.scheduled_at:
            if pending_notifs:
                for notification in pending_notifs:
                    notification.scheduled_at = task.scheduled_at
                    notification.message = (
                        f"Reminder: '{task.title}' is scheduled for "
                        f"{task.scheduled_at.strftime('%H:%M')}"
                    )

                db.commit()

                for notification in pending_notifs:
                    try:
                        schedule_notification(
                            notification.id,
                            notification.scheduled_at,
                        )
                    except Exception:
                        logger.exception(
                            "Failed to reschedule notification %s",
                            notification.id,
                        )
            else:
                NotificationService.create_task_reminder(db, task, child)
        elif pending_notifs:
            for notification in pending_notifs:
                notification.status = NotificationStatus.CANCELLED

            db.commit()

            for notification in pending_notifs:
                try:
                    cancel_notification_job(notification.id)
                except Exception:
                    logger.exception(
                        "Failed to cancel notification job %s",
                        notification.id,
                    )

    # ---------------------------------------------------------
    # Cancel task reminders
    # ---------------------------------------------------------

    @staticmethod
    def cancel_task_reminder(db: Session, task_id: int) -> None:
        """Cancel pending notifications and their RQ jobs."""
        pending_notifs = db.execute(
            select(Notification).where(
                Notification.task_id == task_id,
                Notification.status == NotificationStatus.PENDING,
            )
        ).scalars().all()

        for notification in pending_notifs:
            notification.status = NotificationStatus.CANCELLED

        db.commit()

        for notification in pending_notifs:
            try:
                cancel_notification_job(notification.id)
            except Exception:
                logger.exception(
                    "Failed to cancel notification job %s",
                    notification.id,
                )

    # ---------------------------------------------------------
    # Fetch user notifications
    # ---------------------------------------------------------

    @staticmethod
    def get_user_notifications(
        db: Session,
        user: User,
    ) -> list[Notification]:
        """Fetch notifications accessible to the authenticated user."""
        if user.role == UserRole.CAREGIVER:
            child_ids = db.execute(
                select(Child.id).where(Child.caregiver_id == user.id)
            ).scalars().all()

            return list(
                db.execute(
                    select(Notification)
                    .where(
                        (Notification.user_id == user.id)
                        | (Notification.child_id.in_(child_ids))
                    )
                    .order_by(Notification.scheduled_at.desc())
                ).scalars().all()
            )

        return list(
            db.execute(
                select(Notification)
                .where(Notification.user_id == user.id)
                .order_by(Notification.scheduled_at.desc())
            ).scalars().all()
        )
