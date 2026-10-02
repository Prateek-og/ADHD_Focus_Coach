from datetime import datetime
from pydantic import BaseModel, ConfigDict


class DeviceCreate(BaseModel):
    expo_push_token: str
    platform: str


class DeviceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    expo_push_token: str
    platform: str
    is_active: bool
    created_at: datetime
