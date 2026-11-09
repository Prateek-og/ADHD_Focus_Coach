import enum
from datetime import datetime, timezone
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, Index, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class TaskStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class FocusState(str, enum.Enum):
    INITIATED = "INITIATED"
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    BREAK = "BREAK"
    COMPLETED = "COMPLETED"


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)

    child_id: Mapped[int] = mapped_column(
        ForeignKey("children.id"),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    scheduled_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    priority: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus),
        default=TaskStatus.PENDING,
        nullable=False,
    )

    current_step_position: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    focus_state: Mapped[FocusState] = mapped_column(
        Enum(FocusState),
        default=FocusState.INITIATED,
        nullable=False,
    )

    last_activity_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    # Durable AI adaptation quotas are task-wide, not step-wide.
    refinement_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    decomposition_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Timestamp is retained permanently to enforce one break per task.
    break_started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    is_deleted: Mapped[bool] = mapped_column(
    Boolean,
    default=False,
    nullable=False,
    )

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    # Worker indexes for efficient lookup
    __table_args__ = (
        # Active/inactive task lookup: focus_state + status + last_activity_at
        Index("ix_tasks_focus_status_activity", "focus_state", "status", "last_activity_at"),
        # Child's tasks lookup
        Index("ix_tasks_child_id", "child_id"),
    )
