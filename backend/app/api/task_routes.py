"""
Task, AI breakdown, and Focus Execution API routes.
Follows authoritative contract in ADHD_Focus_Coach_API_Documentation_Corrected.pdf.
"""

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.redis import check_rate_limit
from app.core.security import (
    get_current_user,
    require_caregiver,
    require_child_role,
    verify_task_access,
    verify_task_child_only,
)
from app.models.user import User
from app.schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    TaskStepResponse,
    TaskStepCompleteResponse,
    StepCompleteRequest,
    FocusStateResponse,
    StepStuckRequest,
    StepStuckResponse,
)
from app.services.task_service import TaskService
from app.services.ai_service import AIService
from app.services.focus_service import FocusService

router = APIRouter(prefix="/tasks", tags=["Tasks & Focus Execution"])


# ---------------------------------------------------------------------------
# TASKS CRUD
# ---------------------------------------------------------------------------


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    data: TaskCreate,
    db: Session = Depends(get_db),
    caregiver: User = Depends(require_caregiver),
) -> TaskResponse:
    """Caregiver creates a new task."""
    task = TaskService.create_task(db, data, caregiver)
    return TaskResponse.model_validate(task)


@router.get("", response_model=list[TaskResponse])
def list_tasks(
    child_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TaskResponse]:
    """
    List tasks:
    Caregiver sees tasks for their children (optional child_id filter).
    Child sees only their own tasks.
    """
    tasks = TaskService.get_tasks_for_user(db, current_user, child_id=child_id)
    return [TaskResponse.model_validate(t) for t in tasks]


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskResponse:
    """Get task resource (Caregiver owning child OR child themselves)."""
    task = verify_task_access(db, task_id, current_user)
    return TaskResponse.model_validate(task)


@router.get("/{task_id}/steps", response_model=list[TaskStepResponse])
def get_task_steps(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TaskStepResponse]:
    """Get steps for task (Caregiver owning child OR child themselves)."""
    task = verify_task_access(db, task_id, current_user)
    steps = TaskService.get_task_steps(db, task.id)
    return [TaskStepResponse.model_validate(s) for s in steps]


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    caregiver: User = Depends(require_caregiver),
) -> TaskResponse:
    """Caregiver updates task details."""
    task = verify_task_access(db, task_id, caregiver)
    updated = TaskService.update_task(db, task, data)
    return TaskResponse.model_validate(updated)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    caregiver: User = Depends(require_caregiver),
) -> None:
    """Caregiver deletes a task and cancels related pending notifications."""
    task = verify_task_access(db, task_id, caregiver)
    TaskService.delete_task(db, task)
    return None


# ---------------------------------------------------------------------------
# AI OPERATIONS
# ---------------------------------------------------------------------------


@router.post("/{task_id}/breakdown", response_model=list[TaskStepResponse])
def task_breakdown(
    task_id: int,
    db: Session = Depends(get_db),
    caregiver: User = Depends(require_caregiver),
    idempotency_key: str | None = Header(None, alias="Idempotency-Key"),
) -> list[TaskStepResponse]:
    """
    POST /tasks/{task_id}/breakdown:
    Caregiver triggers initial AI breakdown.
    Allowed ONLY when task has no existing TaskSteps. If steps exist -> 409 Conflict.
    Supports Idempotency-Key.
    """
    task = verify_task_access(db, task_id, caregiver)

    # Rate limiting
    if not check_rate_limit(f"ai_breakdown:{caregiver.id}", max_requests=10, window_seconds=60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="AI breakdown rate limit exceeded. Please wait a moment.",
        )

    steps = AIService.breakdown_task(db, task, idempotency_key=idempotency_key)
    return [TaskStepResponse.model_validate(s) for s in steps]






# ---------------------------------------------------------------------------
# FOCUS EXECUTION (CHILD ONLY)
# ---------------------------------------------------------------------------


@router.post("/{task_id}/start", response_model=TaskResponse)
def start_focus(
    task_id: int,
    db: Session = Depends(get_db),
    child_user: User = Depends(require_child_role),
) -> TaskResponse:
    """Child starts focus execution for their task."""
    task = verify_task_child_only(db, task_id, child_user)
    updated = FocusService.start_focus(db, task)
    return TaskResponse.model_validate(updated)


@router.get("/{task_id}/focus-state", response_model=FocusStateResponse)
def get_focus_state(
    task_id: int,
    db: Session = Depends(get_db),
    child_user: User = Depends(require_child_role),
) -> FocusStateResponse:
    """
    Child polls authoritative focus state.
    READ-ONLY: Never updates last_activity_at or mutates state.
    """
    task = verify_task_child_only(db, task_id, child_user)
    return FocusService.get_focus_state(db, task)


@router.post("/{task_id}/steps/{step_id}/complete", response_model=TaskStepCompleteResponse)
def complete_step(
    task_id: int,
    step_id: int,
    data: StepCompleteRequest,
    db: Session = Depends(get_db),
    child_user: User = Depends(require_child_role),
) -> TaskStepCompleteResponse:
    """
    Child completes current step.
    Carries expected_step_position for concurrency check (409 Conflict if mismatch).
    Returns NEXT_STEP or TASK_COMPLETED.
    """
    task = verify_task_child_only(db, task_id, child_user)
    return FocusService.complete_step(
        db,
        task,
        step_id=step_id,
        expected_step_position=data.expected_step_position,
    )


@router.post("/{task_id}/steps/{step_id}/stuck", response_model=StepStuckResponse)
def handle_stuck(
    task_id: int,
    step_id: int,
    data: StepStuckRequest,
    db: Session = Depends(get_db),
    child_user: User = Depends(require_child_role),
    idempotency_key: str | None = Header(None, alias="Idempotency-Key"),
) -> StepStuckResponse:
    """
    Child signals they are stuck.
    Carries expected_step_position (409 Conflict if mismatch).
    Routes to REFINE, DECOMPOSE, or BREAK.
    Cap: max 3 AI adaptations per step.
    """
    task = verify_task_child_only(db, task_id, child_user)

    if not check_rate_limit(f"stuck:{child_user.id}", max_requests=10, window_seconds=60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Stuck adaptation rate limit exceeded.",
        )

    return FocusService.handle_stuck(
        db,
        task,
        step_id=step_id,
        reason=data.reason,
        expected_step_position=data.expected_step_position,
        idempotency_key=idempotency_key,
    )


@router.post("/{task_id}/break", response_model=TaskResponse)
def take_break(
    task_id: int,
    db: Session = Depends(get_db),
    child_user: User = Depends(require_child_role),
) -> TaskResponse:
    """Child moves focus state into BREAK."""
    task = verify_task_child_only(db, task_id, child_user)
    updated = FocusService.take_break(db, task)
    return TaskResponse.model_validate(updated)


@router.post("/{task_id}/resume", response_model=TaskResponse)
def resume_focus(
    task_id: int,
    db: Session = Depends(get_db),
    child_user: User = Depends(require_child_role),
) -> TaskResponse:
    """Child resumes active focus from BREAK."""
    task = verify_task_child_only(db, task_id, child_user)
    updated = FocusService.resume(db, task)
    return TaskResponse.model_validate(updated)
