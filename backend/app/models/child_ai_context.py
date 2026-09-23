from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ChildAIContext(Base):
    __tablename__ = "child_ai_context"

    id: Mapped[int] = mapped_column(primary_key=True)

    child_id: Mapped[int] = mapped_column(
        ForeignKey("children.id"),
        unique=True,
        nullable=False,
    )

    preferences: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )