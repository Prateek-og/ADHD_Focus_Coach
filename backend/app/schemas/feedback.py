from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FeedbackCreate(BaseModel):
    task_id: int
    task_step_id: int | None = None

    feeling: str | None = None
    helped_by: str | None = None
    difficulty: str | None = None


class FeedbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    child_id: int
    task_id: int
    task_step_id: int | None
    feeling: str | None
    helped_by: str | None
    difficulty: str | None
    created_at: datetime