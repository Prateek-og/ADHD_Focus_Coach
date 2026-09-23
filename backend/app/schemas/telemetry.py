from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.telemetry import TelemetryEventType


class TelemetryEventCreate(BaseModel):
    task_id: int | None = None
    task_step_id: int | None = None
    event_type: TelemetryEventType
    metadata: dict | None = None


class TelemetryEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    child_id: int
    task_id: int | None
    task_step_id: int | None
    event_type: TelemetryEventType
    metadata: dict | None
    created_at: datetime