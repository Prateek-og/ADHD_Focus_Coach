import enum
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

from app.models.task import FocusState, TaskStatus
from app.models.task_step import TaskStepStatus


class TaskCreate(BaseModel):
    child_id: int | None = None  # derived or provided by caregiver
    title: str
    description: str | None = None
    scheduled_at: datetime | None = None
    priority: int = 0


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    scheduled_at: datetime | None = None
    priority: int | None = None
    status: TaskStatus | None = None


class TaskStepResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    position: int
    description: str
    estimated_minutes: int
    status: TaskStepStatus
    adaptation_count: int = 0


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


class StepCompleteRequest(BaseModel):
    expected_step_position: int


class StepCompleteResultEnum(str, enum.Enum):
    NEXT_STEP = "NEXT_STEP"
    TASK_COMPLETED = "TASK_COMPLETED"


class TaskStepCompleteResponse(BaseModel):
    result: StepCompleteResultEnum
    task_id: int
    completed_step_id: int
    next_step_position: int | None
    task_status: TaskStatus
    focus_state: FocusState
    current_step: TaskStepResponse | None = None


class FocusStateResponse(BaseModel):
    task_id: int
    focus_state: FocusState
    task_status: TaskStatus
    current_step_position: int | None
    current_step: TaskStepResponse | None = None
    last_activity_at: datetime | None = None
    inactivity_threshold_seconds: int
    break_duration_seconds: int | None = None


class StuckReasonEnum(str, enum.Enum):
    TOO_HARD = "TOO_HARD"
    TOO_LONG = "TOO_LONG"
    CONFUSED = "CONFUSED"
    NEED_BREAK = "NEED_BREAK"


class StuckOutcomeEnum(str, enum.Enum):
    REFINE = "REFINE"
    DECOMPOSE = "DECOMPOSE"
    BREAK = "BREAK"


class StepStuckRequest(BaseModel):
    reason: StuckReasonEnum | str
    expected_step_position: int


class StepStuckResponse(BaseModel):
    outcome: StuckOutcomeEnum
    task_id: int
    step_id: int
    message: str
    updated_step: TaskStepResponse | None = None
    new_steps: list[TaskStepResponse] | None = None
    focus_state: FocusState