"""
Deterministic Focus Session FSM.

The FSM controls the lifecycle of a complete focus session.
AI adaptation changes steps, never the focus state.
"""

from __future__ import annotations

import enum

from app.models.task import FocusState


class FocusFSMAction(str, enum.Enum):
    START = "START"
    COMPLETE_STEP = "COMPLETE_STEP"
    COMPLETE_ALL_STEPS = "COMPLETE_ALL_STEPS"
    MARK_INACTIVE = "MARK_INACTIVE"
    TAKE_BREAK = "TAKE_BREAK"
    LETS_GO = "LETS_GO"
    RESUME = "RESUME"


ALLOWED_TRANSITIONS: dict[
    tuple[FocusState, FocusFSMAction],
    FocusState,
] = {
    # Task starts
    (FocusState.INITIATED, FocusFSMAction.START): FocusState.ACTIVE,

    # Normal execution
    (FocusState.ACTIVE, FocusFSMAction.COMPLETE_STEP): FocusState.ACTIVE,
    (FocusState.ACTIVE, FocusFSMAction.COMPLETE_ALL_STEPS): FocusState.COMPLETED,

    # Inactivity
    (FocusState.ACTIVE, FocusFSMAction.MARK_INACTIVE): FocusState.INACTIVE,

    # Breaks
    (FocusState.ACTIVE, FocusFSMAction.TAKE_BREAK): FocusState.BREAK,
    (FocusState.INACTIVE, FocusFSMAction.TAKE_BREAK): FocusState.BREAK,

    # Child responds to inactivity prompt
    (FocusState.INACTIVE, FocusFSMAction.LETS_GO): FocusState.ACTIVE,

    # Child resumes from an intentional break
    (FocusState.BREAK, FocusFSMAction.RESUME): FocusState.ACTIVE,
}


def can_transition(
    current_state: FocusState,
    action: FocusFSMAction,
) -> bool:
    """Check whether an action is valid for the current state."""
    try:
        current_state = FocusState(current_state)
        action = FocusFSMAction(action)
    except (TypeError, ValueError):
        return False

    return (current_state, action) in ALLOWED_TRANSITIONS


def transition_focus_state(
    current_state: FocusState,
    action: FocusFSMAction,
) -> FocusState:
    """Return the next state or raise ValueError for an invalid transition."""

    try:
        current_state = FocusState(current_state)
        action = FocusFSMAction(action)
    except (TypeError, ValueError) as exc:
        raise ValueError("Unknown focus state or action") from exc

    next_state = ALLOWED_TRANSITIONS.get((current_state, action))

    if next_state is None:
        raise ValueError(
            f"Invalid focus transition: "
            f"{current_state.value} + {action.value}"
        )

    return next_state