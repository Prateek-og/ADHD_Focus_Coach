from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[int] = mapped_column(primary_key=True)

    child_id: Mapped[int] = mapped_column(
        ForeignKey("children.id"),
        nullable=False,
    )

    task_id: Mapped[int] = mapped_column(
        ForeignKey("tasks.id"),
        nullable=False,
    )

    task_step_id: Mapped[int | None] = mapped_column(
        ForeignKey("task_steps.id"),
        nullable=True,
    )

    feeling: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    helped_by: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    difficulty: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )