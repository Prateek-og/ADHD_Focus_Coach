from datetime import datetime
from pydantic import BaseModel, ConfigDict


class StreakResponse(BaseModel):
    child_id: int
    current_streak: int
    longest_streak: int


class ProgressSummaryResponse(BaseModel):
    child_id: int
    tasks_completed: int
    tasks_total: int
    steps_completed: int
    current_streak: int
    longest_streak: int
    completion_rate: float
    recent_summary: str | None = None


class ProgressResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    child_id: int
    tasks_completed: int
    tasks_total: int
    steps_completed: int
    current_streak: int
    longest_streak: int
    average_completion_minutes: float
    recent_summary: str | None = None
    updated_at: datetime
