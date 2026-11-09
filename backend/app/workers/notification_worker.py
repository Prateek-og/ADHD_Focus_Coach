"""RQ worker for scheduled task reminders."""

import logging
from datetime import datetime

from app.core.database import SessionLocal
from app.models.notification import Notification, NotificationStatus
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


def send_task_reminder(notification_id: int) -> None:
    """Verify and dispatch a scheduled notification using active Device rows."""
    db = SessionLocal()

    try:
        notification = db.get(Notification, notification_id)

        if notification is None:
            logger.warning("Notification %s does not exist", notification_id)
            return

        if notification.status != NotificationStatus.PENDING:
            logger.info("Notification %s is no longer pending", notification_id)
            return

        if notification.scheduled_at > datetime.utcnow():
            logger.info("Notification %s is not due yet", notification_id)
            return

        sent = NotificationService.dispatch_notification(db, notification)
        if not sent:
            logger.warning(
                "Notification %s was not sent; no active device accepted it",
                notification_id,
            )

    except Exception:
        db.rollback()
        logger.exception("Failed to process notification %s", notification_id)
        raise

    finally:
        db.close()
