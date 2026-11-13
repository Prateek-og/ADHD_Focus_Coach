from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[int] = mapped_column(primary_key=True)

    child_id: Mapped[int] = mapped_column(
        ForeignKey("children.id"), nullable=False
    )
    task_id: Mapped[int] = mapped_column(
        ForeignKey("tasks.id"), nullable=False
    )


    # Current seven-question feedback fields. Values are stable option IDs,
    # not frontend labels or emoji.
    task_difficulty: Mapped[str | None] = mapped_column(String(40), nullable=True)
    hardest_part: Mapped[str | None] = mapped_column(String(40), nullable=True)
    helped_by: Mapped[str | None] = mapped_column(String(40), nullable=True)
    instruction_clarity: Mapped[str | None] = mapped_column(String(40), nullable=True)
    focus_level: Mapped[str | None] = mapped_column(String(40), nullable=True)
    when_stuck: Mapped[str | None] = mapped_column(String(40), nullable=True)
    next_time: Mapped[str | None] = mapped_column(String(40), nullable=True)

    # Legacy columns retained so existing feedback rows remain readable.
    # New submissions should use the seven fields above.
    feeling: Mapped[str | None] = mapped_column(String(50), nullable=True)
    difficulty: Mapped[str | None] = mapped_column(String(100), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
