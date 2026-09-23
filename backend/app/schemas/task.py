from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.task import FocusState, TaskStatus
from app.models.task_step import TaskStepStatus


class TaskCreate(BaseModel):
    title: str
    description: str | None = None

    scheduled_at: datetime | None = None

    priority: int = 0


class TaskStepResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    position: int
    description: str
    estimated_minutes: int
    status: TaskStepStatus


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    child_id: int
    title: str
    description: str | None
    scheduled_at: datetime | None
    priority: int
    status: TaskStatus
    current_step_position: int | None
    focus_state: FocusState
    last_activity_at: datetime | None


class TaskWithStepsResponse(TaskResponse):
    steps: list[TaskStepResponse] = []


class TaskStepCompleteResponse(BaseModel):
    task_id: int
    completed_step_id: int
    next_step_position: int | None
    task_status: TaskStatus
    focus_state: FocusState