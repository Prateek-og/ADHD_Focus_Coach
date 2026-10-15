from pydantic import BaseModel, ConfigDict, Field, SecretStr

class ChildCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    age: int = Field(ge=1, le=120)
    class_name: str = Field(min_length=1, max_length=50)
    description: str | None = None
    username: str = Field(min_length=4, max_length=64)
    password: SecretStr = Field(min_length=15)


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