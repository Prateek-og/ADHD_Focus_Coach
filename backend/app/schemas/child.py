from pydantic import BaseModel, ConfigDict


class ChildCreate(BaseModel):
    name: str
    age: int
    class_name: str
    description: str | None = None
    user_id: int | None = None


class ChildUpdate(BaseModel):
    name: str | None = None
    age: int | None = None
    class_name: str | None = None
    description: str | None = None


class ChildResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    caregiver_id: int
    user_id: int | None = None
    name: str
    age: int
    class_name: str
    description: str | None = None


class ChildExportResponse(BaseModel):
    child: ChildResponse
    total_tasks: int
    completed_tasks: int
    total_feedback: int
    preferences: str | None = None