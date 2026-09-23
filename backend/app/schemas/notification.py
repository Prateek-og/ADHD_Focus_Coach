from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.notification import (
    NotificationStatus,
    NotificationType,
)


class NotificationCreate(BaseModel):
    child_id: int
    task_id: int | None = None
    type: NotificationType
    message: str
    scheduled_at: datetime


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    child_id: int
    task_id: int | None
    type: NotificationType
    message: str
    scheduled_at: datetime
    status: NotificationStatus