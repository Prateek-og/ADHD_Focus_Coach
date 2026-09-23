from pydantic import BaseModel, Field


class AITaskStep(BaseModel):
    description: str = Field(min_length=1)
    estimated_minutes: int = Field(gt=0, lt=5)


class AITaskBreakdown(BaseModel):
    steps: list[AITaskStep] = Field(min_length=3, max_length=5)


class AIAdaptedStep(BaseModel):
    description: str = Field(min_length=1)
    estimated_minutes: int = Field(gt=0, lt=5)