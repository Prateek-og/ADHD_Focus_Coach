from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.telemetry import TelemetryEventType


class TelemetryEventCreate(BaseModel):
    event_id: str = Field(min_length=1, max_length=255)
    child_id: int | None = None
    task_id: int | None = None
    task_step_id: int | None = None
    event_type: TelemetryEventType
    metadata: dict | None = None


class TelemetryBatchRequest(BaseModel):
    events: list[TelemetryEventCreate] = Field(
        min_length=1,
        max_length=50,
    )


class TelemetryEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: str
    user_id: int
    child_id: int | None
    task_id: int | None
    task_step_id: int | None
    event_type: TelemetryEventType
    created_at: datetime