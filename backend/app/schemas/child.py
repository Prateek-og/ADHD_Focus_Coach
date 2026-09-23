from pydantic import BaseModel, ConfigDict


class ChildCreate(BaseModel):
    name: str
    age: int
    class_name: str
    description: str | None = None


class ChildResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    caregiver_id: int
    name: str
    age: int
    class_name: str
    description: str | None