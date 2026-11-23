"""
Test suite for Focus Execution, Deterministic State Machine (FocusFSM), and Timers.
Covers FocusFSM transitions, session initialization, read-only state polling,
concurrency step completion, stuck adaptation (refine & decompose), and break cycles.
"""

from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.algorithms.focus_fsm import (
    FocusFSMAction,
    can_transition,
    transition_focus_state,
)
from app.models.child import Child
from app.models.task import FocusState, Task, TaskStatus
from app.models.task_step import TaskStep, TaskStepStatus
from app.models.user import User
from tests.conftest import make_auth_header


# ---------------------------------------------------------------------------
# FocusFSM Algorithm Unit Tests
# ---------------------------------------------------------------------------

def test_focus_fsm_valid_lifecycle_transitions():
    """Verify all valid state transitions through the complete focus session lifecycle."""
    # Start: INITIATED -> ACTIVE
    assert transition_focus_state(FocusState.INITIATED, FocusFSMAction.START) == FocusState.ACTIVE

    # Normal step complete maintains ACTIVE
    assert transition_focus_state(FocusState.ACTIVE, FocusFSMAction.COMPLETE_STEP) == FocusState.ACTIVE

    # Final step completes task: ACTIVE -> COMPLETED
    assert transition_focus_state(FocusState.ACTIVE, FocusFSMAction.COMPLETE_ALL_STEPS) == FocusState.COMPLETED

    # Inactivity: ACTIVE -> INACTIVE
    assert transition_focus_state(FocusState.ACTIVE, FocusFSMAction.MARK_INACTIVE) == FocusState.INACTIVE

    # Break: ACTIVE -> BREAK and INACTIVE -> BREAK
    assert transition_focus_state(FocusState.ACTIVE, FocusFSMAction.TAKE_BREAK) == FocusState.BREAK
    assert transition_focus_state(FocusState.INACTIVE, FocusFSMAction.TAKE_BREAK) == FocusState.BREAK

    # Resume from break: BREAK -> ACTIVE
    assert transition_focus_state(FocusState.BREAK, FocusFSMAction.RESUME) == FocusState.ACTIVE

    # Respond to inactivity prompt: INACTIVE -> ACTIVE
    assert transition_focus_state(FocusState.INACTIVE, FocusFSMAction.LETS_GO) == FocusState.ACTIVE


def test_focus_fsm_invalid_transitions_raise_value_error():
    """Invalid actions for a given state raise ValueError and can_transition returns False."""
    assert not can_transition(FocusState.INITIATED, FocusFSMAction.COMPLETE_STEP)
    with pytest.raises(ValueError, match="Invalid focus transition"):
        transition_focus_state(FocusState.INITIATED, FocusFSMAction.COMPLETE_STEP)

    assert not can_transition(FocusState.COMPLETED, FocusFSMAction.START)
    with pytest.raises(ValueError, match="Invalid focus transition"):
        transition_focus_state(FocusState.COMPLETED, FocusFSMAction.START)


# ---------------------------------------------------------------------------
# Focus Session Execution API Tests
# ---------------------------------------------------------------------------

def test_start_focus_requires_steps(client: TestClient, child_user: User, child: Child, db: Session):
    """POST /tasks/{id}/start requires generated TaskSteps; fails with 400 if empty."""
    task = Task(child_id=child.id, title="No Steps Task", focus_state=FocusState.INITIATED)
    db.add(task)
    db.commit()

    headers = make_auth_header(child_user.clerk_user_id)
    response = client.post(f"/tasks/{task.id}/start", headers=headers)
    assert response.status_code == 400
    assert "generate task steps" in response.json()["detail"].lower()


def test_start_focus_success(client: TestClient, child_user: User, child: Child, db: Session):
    """Starting focus activates task and marks first step IN_PROGRESS."""
    task = Task(child_id=child.id, title="Focus Task", focus_state=FocusState.INITIATED)
    db.add(task)
    db.commit()

    step1 = TaskStep(task_id=task.id, position=1, description="Step 1", estimated_minutes=5)
    step2 = TaskStep(task_id=task.id, position=2, description="Step 2", estimated_minutes=5)
    db.add_all([step1, step2])
    db.commit()

    headers = make_auth_header(child_user.clerk_user_id)
    response = client.post(f"/tasks/{task.id}/start", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "IN_PROGRESS"
    assert data["focus_state"] == "ACTIVE"
    assert data["current_step_position"] == 1

    db.refresh(step1)
    assert step1.status == TaskStepStatus.IN_PROGRESS


def test_focus_state_read_only_invariance(
    client: TestClient, child_user: User, child: Child, db: Session
):
    """GET /tasks/{id}/focus-state is strictly read-only: does NOT modify last_activity_at."""
    recent_time = datetime.now(timezone.utc)
    task = Task(
        child_id=child.id,
        title="Polling Task",
        focus_state=FocusState.ACTIVE,
        status=TaskStatus.IN_PROGRESS,
        last_activity_at=recent_time,
        current_step_position=1,
    )
    db.add(task)
    db.commit()

    step = TaskStep(
        task_id=task.id,
        position=1,
        description="Step 1",
        estimated_minutes=3,
        status=TaskStepStatus.IN_PROGRESS,
    )
    db.add(step)
    db.commit()

    headers = make_auth_header(child_user.clerk_user_id)
    response = client.get(f"/tasks/{task.id}/focus-state", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["task_id"] == task.id
    assert data["focus_state"] == "ACTIVE"
    assert data["current_step"] is not None

    # Invariant: last_activity_at remains identical
    db.refresh(task)
    assert task.last_activity_at is not None
    assert abs((task.last_activity_at.replace(tzinfo=timezone.utc) - recent_time).total_seconds()) < 1


def test_complete_step_advances_and_completes_task(
    client: TestClient, child_user: User, child: Child, db: Session
):
    """Completing steps sequentially advances position, and finishing all steps completes the task."""
    task = Task(
        child_id=child.id,
        title="Multi-step Task",
        focus_state=FocusState.ACTIVE,
        status=TaskStatus.IN_PROGRESS,
        current_step_position=1,
    )
    db.add(task)
    db.commit()

    step1 = TaskStep(
        task_id=task.id,
        position=1,
        description="Part 1",
        estimated_minutes=2,
        status=TaskStepStatus.IN_PROGRESS,
    )
    step2 = TaskStep(
        task_id=task.id,
        position=2,
        description="Part 2",
        estimated_minutes=2,
        status=TaskStepStatus.PENDING,
    )
    db.add_all([step1, step2])
    db.commit()

    headers = make_auth_header(child_user.clerk_user_id)

    # Complete Step 1 -> advances to NEXT_STEP
    res1 = client.post(
        f"/tasks/{task.id}/steps/{step1.id}/complete",
        json={"expected_step_position": 1},
        headers=headers,
    )
    assert res1.status_code == 200
    assert res1.json()["result"] == "NEXT_STEP"

    db.refresh(task)
    assert task.current_step_position == 2

    # Complete Step 2 -> TASK_COMPLETED
    res2 = client.post(
        f"/tasks/{task.id}/steps/{step2.id}/complete",
        json={"expected_step_position": 2},
        headers=headers,
    )
    assert res2.status_code == 200
    assert res2.json()["result"] == "TASK_COMPLETED"

    db.refresh(task)
    assert task.status == TaskStatus.COMPLETED
    assert task.focus_state == FocusState.COMPLETED


def test_complete_step_concurrency_conflict(
    client: TestClient, child_user: User, child: Child, db: Session
):
    """Mismatched expected_step_position yields 409 Conflict."""
    task = Task(
        child_id=child.id,
        title="Concurrency Task",
        focus_state=FocusState.ACTIVE,
        current_step_position=2,
    )
    db.add(task)
    db.commit()

    step = TaskStep(
        task_id=task.id,
        position=2,
        description="Step 2",
        estimated_minutes=3,
        status=TaskStepStatus.IN_PROGRESS,
    )
    db.add(step)
    db.commit()

    headers = make_auth_header(child_user.clerk_user_id)
    # Send expected 1 while current is 2 -> 409
    response = client.post(
        f"/tasks/{task.id}/steps/{step.id}/complete",
        json={"expected_step_position": 1},
        headers=headers,
    )
    assert response.status_code == 409


def test_handle_stuck_refine(client: TestClient, child_user: User, child: Child, db: Session):
    """Reason TOO_HARD adapts step with REFINE outcome and updates description."""
    task = Task(
        child_id=child.id,
        title="Hard Task",
        focus_state=FocusState.ACTIVE,
        current_step_position=1,
        refinement_count=0,
    )
    db.add(task)
    db.commit()

    step = TaskStep(
        task_id=task.id,
        position=1,
        description="Complex Step",
        estimated_minutes=3,
        status=TaskStepStatus.IN_PROGRESS,
    )
    db.add(step)
    db.commit()

    headers = make_auth_header(child_user.clerk_user_id)
    response = client.post(
        f"/tasks/{task.id}/steps/{step.id}/stuck",
        json={"reason": "TOO_HARD", "expected_step_position": 1},
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["outcome"] == "REFINE"
    assert data["updated_step"] is not None

    db.refresh(task)
    assert task.refinement_count == 1


def test_handle_stuck_decompose(client: TestClient, child_user: User, child: Child, db: Session):
    """Reason TOO_LONG decomposes current step into sub-steps."""
    task = Task(
        child_id=child.id,
        title="Long Task",
        focus_state=FocusState.ACTIVE,
        current_step_position=1,
        decomposition_count=0,
    )
    db.add(task)
    db.commit()

    step = TaskStep(
        task_id=task.id,
        position=1,
        description="Huge Step",
        estimated_minutes=4,
        status=TaskStepStatus.IN_PROGRESS,
    )
    db.add(step)
    db.commit()

    headers = make_auth_header(child_user.clerk_user_id)
    response = client.post(
        f"/tasks/{task.id}/steps/{step.id}/stuck",
        json={"reason": "TOO_LONG", "expected_step_position": 1},
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["outcome"] == "DECOMPOSE"

    db.refresh(task)
    assert task.decomposition_count == 1


def test_handle_stuck_refinement_cap_returns_429(
    client: TestClient, child_user: User, child: Child, db: Session
):
    """Refinement cap (1 per task) exceeded returns 429 Too Many Requests."""
    task = Task(
        child_id=child.id,
        title="Capped Task",
        focus_state=FocusState.ACTIVE,
        current_step_position=1,
        refinement_count=1,  # Already used the allowed refinement
    )
    db.add(task)
    db.commit()

    step = TaskStep(
        task_id=task.id,
        position=1,
        description="Step 1",
        estimated_minutes=3,
        status=TaskStepStatus.IN_PROGRESS,
    )
    db.add(step)
    db.commit()

    headers = make_auth_header(child_user.clerk_user_id)
    response = client.post(
        f"/tasks/{task.id}/steps/{step.id}/stuck",
        json={"reason": "TOO_HARD", "expected_step_position": 1},
        headers=headers,
    )
    assert response.status_code == 429
    assert "refinement" in response.json()["detail"].lower()


def test_focus_break_resume_and_lets_go_flow(
    client: TestClient, child_user: User, child: Child, db: Session
):
    """Child takes break, resumes, and answers inactivity prompt."""
    task = Task(
        child_id=child.id,
        title="Break Task",
        focus_state=FocusState.ACTIVE,
        status=TaskStatus.IN_PROGRESS,
        current_step_position=1,
    )
    db.add(task)
    db.commit()

    step = TaskStep(
        task_id=task.id,
        position=1,
        description="Step 1",
        estimated_minutes=3,
        status=TaskStepStatus.IN_PROGRESS,
    )
    db.add(step)
    db.commit()

    headers = make_auth_header(child_user.clerk_user_id)

    # 1. Take break -> BREAK
    res_break = client.post(f"/tasks/{task.id}/break", headers=headers)
    assert res_break.status_code == 200
    assert res_break.json()["focus_state"] == "BREAK"

    # 2. Resume -> ACTIVE
    res_resume = client.post(f"/tasks/{task.id}/resume", headers=headers)
    assert res_resume.status_code == 200
    assert res_resume.json()["focus_state"] == "ACTIVE"

    # 3. Mark inactive then Lets Go -> ACTIVE
    task.focus_state = FocusState.INACTIVE
    db.commit()

    res_letsgo = client.post(f"/tasks/{task.id}/lets-go", headers=headers)
    assert res_letsgo.status_code == 200
    assert res_letsgo.json()["focus_state"] == "ACTIVE"
