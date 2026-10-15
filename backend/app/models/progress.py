"""
ProgressSnapshot model for storing precomputed progress values.
Written by the scheduled progress job; read by GET /progress endpoints.
"""

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ProgressSnapshot(Base):
    __tablename__ = "progress_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)

    child_id: Mapped[int] = mapped_column(
        ForeignKey("children.id"),
        unique=True,
        nullable=False,
    )

    tasks_completed: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    tasks_total: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    steps_completed: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    current_streak: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    longest_streak: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    average_completion_minutes: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )

    recent_summary: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
