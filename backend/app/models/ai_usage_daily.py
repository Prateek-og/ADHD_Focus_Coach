
from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AIUsageDaily(Base):
    """Durable per-caregiver daily quota for initial task breakdowns."""

    __tablename__ = "ai_usage_daily"

    id: Mapped[int] = mapped_column(primary_key=True)
    caregiver_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    usage_date: Mapped[date] = mapped_column(Date, nullable=False)
    breakdown_count: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "caregiver_id", "usage_date",
            name="uq_ai_usage_daily_caregiver_date",
        ),
    )
