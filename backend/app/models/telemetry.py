import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TelemetryEventType(str, enum.Enum):
    TASK_STARTED = "TASK_STARTED"
    STEP_COMPLETED = "STEP_COMPLETED"
    STEP_STUCK = "STEP_STUCK"
    INACTIVITY_TRIGGERED = "INACTIVITY_TRIGGERED"
    BREAK_STARTED = "BREAK_STARTED"
    BREAK_COMPLETED = "BREAK_COMPLETED"
    TASK_COMPLETED = "TASK_COMPLETED"
    FEEDBACK_SUBMITTED = "FEEDBACK_SUBMITTED"


class TelemetryEvent(Base):
    __tablename__ = "telemetry_events"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Unique client-supplied event ID for deduplication
    event_id: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
    )

    # Authenticated user who generated the event
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    # Optional child context.
    # Caregiver events may refer to a child;
    # some caregiver events may not.
    child_id: Mapped[int | None] = mapped_column(
        ForeignKey("children.id"),
        nullable=True,
    )

    task_id: Mapped[int | None] = mapped_column(
        ForeignKey("tasks.id"),
        nullable=True,
    )

    task_step_id: Mapped[int | None] = mapped_column(
        ForeignKey("task_steps.id"),
        nullable=True,
    )

    event_type: Mapped[TelemetryEventType] = mapped_column(
        Enum(TelemetryEventType),
        nullable=False,
    )

    metadata_json: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    __table_args__ = (
        Index(
            "ix_telemetry_user_created",
            "user_id",
            "created_at",
        ),
        Index(
            "ix_telemetry_child_created",
            "child_id",
            "created_at",
        ),
    )