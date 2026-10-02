import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class NotificationType(str, enum.Enum):
    TASK_REMINDER = "TASK_REMINDER"
    TASK_START = "TASK_START"
    BREAK_REMINDER = "BREAK_REMINDER"
    TASK_OVERDUE = "TASK_OVERDUE"
    CAREGIVER_UPDATE = "CAREGIVER_UPDATE"


class NotificationStatus(str, enum.Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    READ = "READ"
    CANCELLED = "CANCELLED"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    child_id: Mapped[int] = mapped_column(
        ForeignKey("children.id"),
        nullable=False,
    )

    task_id: Mapped[int | None] = mapped_column(
        ForeignKey("tasks.id"),
        nullable=True,
    )

    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType),
        nullable=False,
    )

    message: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    scheduled_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
    )

    status: Mapped[NotificationStatus] = mapped_column(
        Enum(NotificationStatus),
        default=NotificationStatus.PENDING,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    # Worker index for pending notification lookup
    __table_args__ = (
        Index("ix_notifications_status_scheduled", "status", "scheduled_at"),
        Index("ix_notifications_user_id", "user_id"),
    )