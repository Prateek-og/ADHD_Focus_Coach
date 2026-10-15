import enum

from sqlalchemy import Enum, ForeignKey, Integer, String, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TaskStepStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    SKIPPED = "SKIPPED"


class TaskStep(Base):
    __tablename__ = "task_steps"

    id: Mapped[int] = mapped_column(primary_key=True)

    task_id: Mapped[int] = mapped_column(
        ForeignKey("tasks.id"),
        nullable=False,
    )

    position: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    estimated_minutes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    status: Mapped[TaskStepStatus] = mapped_column(
        Enum(TaskStepStatus),
        default=TaskStepStatus.PENDING,
        nullable=False,
    )

    # Number of AI adaptations (refine/decompose) applied to this step.
    # Maximum 3 per the contract.
    adaptation_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    __table_args__ = (
        Index("ix_task_steps_task_position", "task_id", "position"),
    )