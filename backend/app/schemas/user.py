
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.user import UserRole


class UserOnboardRequest(BaseModel):
    role: UserRole


class UserCreate(BaseModel):
    # Keep for compatibility with existing internal code.
    # Do not expose this schema on a public signup endpoint.
    clerk_user_id: str
    role: UserRole


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clerk_user_id: str
    role: UserRole
    created_at: datetime
