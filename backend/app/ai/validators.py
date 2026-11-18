
"""Validation and normalization for structured AI provider responses."""

from app.schemas.ai import (
    AITaskBreakdown,
    AIAdaptedStep,
    AITaskStep,
    AIDecomposedSteps,
)


def validate_breakdown_output(data: dict) -> AITaskBreakdown:
    return AITaskBreakdown.model_validate(data)


def _normalize_step(data: dict) -> dict:
    if not isinstance(data, dict):
        raise ValueError("Each AI step must be a JSON object.")
    normalized = dict(data)
    if "description" not in normalized and "step" in normalized:
        normalized["description"] = normalized["step"]
    if "estimated_minutes" not in normalized and "estimatedMinutes" in normalized:
        normalized["estimated_minutes"] = normalized["estimatedMinutes"]
    return normalized


def validate_adapted_step_output(data: dict) -> AIAdaptedStep:
    return AIAdaptedStep.model_validate(_normalize_step(data))


def validate_decomposed_steps_output(data: dict) -> list[AITaskStep]:
    if not isinstance(data, dict) or not isinstance(data.get("steps"), list):
        raise ValueError("AI decomposition output must contain a steps array.")
    normalized = {"steps": [_normalize_step(step) for step in data["steps"]]}
    result = AIDecomposedSteps.model_validate(normalized)
    return result.steps
