"""
FocusService: Authoritative business logic for Focus Execution.
Controlled by the deterministic FocusFSM. Maintains Task fields (current_step_position, focus_state, last_activity_at).
"""

import logging
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.task import Task, TaskStatus, FocusState
from app.models.task_step import TaskStep, TaskStepStatus
from app.algorithms.focus_fsm import transition_focus_state, FocusFSMAction
from app.schemas.task import (
    FocusStateResponse,
    TaskStepResponse,
    TaskStepCompleteResponse,
    StepCompleteResultEnum,
    StepStuckResponse,
    StuckOutcomeEnum,
    StuckReasonEnum,
)
from app.services.ai_service import AIService

logger = logging.getLogger(__name__)


class FocusService:
    INACTIVITY_THRESHOLD_SECONDS = 120

    @staticmethod
    def _transition(task: Task, action: FocusFSMAction) -> None:
        """Apply a validated FSM transition or return HTTP 409."""
        try:
            task.focus_state = transition_focus_state(
                task.focus_state,
                action,
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(exc),
            ) from exc

    @staticmethod
    def _calculate_break_duration(step: TaskStep) -> int:
        # Break duration is derived from the current step's estimated effort.
        # Keep the calculation deterministic; the LLM does not choose it.
        return max(60, step.estimated_minutes * 60 // 2)

    @staticmethod
    def start_focus(db: Session, task: Task) -> Task:
        """Start a task only after its steps have been generated."""

        if task.status == TaskStatus.COMPLETED:
            raise HTTPException(
                status_code=400,
                detail="Task is already completed",
            )

        steps = db.execute(
            select(TaskStep)
            .where(
                TaskStep.task_id == task.id,
                TaskStep.status != TaskStepStatus.COMPLETED,
                TaskStep.status != TaskStepStatus.SKIPPED,
            )
            .order_by(TaskStep.position.asc())
        ).scalars().all()

        if not steps:
            raise HTTPException(
                status_code=400,
                detail="Generate task steps before starting focus.",
            )

        FocusService._transition(task, FocusFSMAction.START)

        now = datetime.now(timezone.utc)

        task.status = TaskStatus.IN_PROGRESS
        task.current_step_position = steps[0].position
        task.last_activity_at = now

        steps[0].status = TaskStepStatus.IN_PROGRESS

        db.commit()
        db.refresh(task)

        return task

    @staticmethod
    def get_focus_state(db: Session, task: Task) -> FocusStateResponse:
        """
        GET /tasks/{task_id}/focus-state:
        Authoritative READ-ONLY endpoint for mobile focus screen.
        MUST NOT: update last_activity_at, reset inactivity timers, mutate task state, or create telemetry.
        """
        current_step_obj = None
        if task.current_step_position is not None:
            step_record = db.execute(
                select(TaskStep).where(
                    TaskStep.task_id == task.id,
                    TaskStep.position == task.current_step_position,
                )
            ).scalar_one_or_none()
            if step_record:
                current_step_obj = TaskStepResponse.model_validate(step_record)

        break_duration = None
        if task.focus_state == FocusState.BREAK and step_record:
            break_duration = FocusService._calculate_break_duration(step_record)

        return FocusStateResponse(
            task_id=task.id,
            focus_state=task.focus_state,
            task_status=task.status,
            current_step_position=task.current_step_position,
            current_step=current_step_obj,
            last_activity_at=task.last_activity_at,
            break_started_at=task.break_started_at,
            inactivity_threshold_seconds=FocusService.INACTIVITY_THRESHOLD_SECONDS,
            break_duration_seconds=break_duration,
        )
    @staticmethod
    def complete_step(
        db: Session,
        task: Task,
        step_id: int,
        expected_step_position: int,
    ) -> TaskStepCompleteResponse:

        if task.focus_state != FocusState.ACTIVE:
            raise HTTPException(
                status_code=409,
                detail="Task is not in an active focus session.",
            )

        if (
            task.current_step_position is None
            or task.current_step_position != expected_step_position
        ):
            raise HTTPException(
                status_code=409,
                detail="Stale step position.",
            )

        step = db.execute(
            select(TaskStep).where(
                TaskStep.id == step_id,
                TaskStep.task_id == task.id,
            )
        ).scalar_one_or_none()

        if not step:
            raise HTTPException(
                status_code=404,
                detail="Task step not found.",
            )

        if step.position != task.current_step_position:
            raise HTTPException(
                status_code=409,
                detail="Step is not the current step.",
            )

        if step.status != TaskStepStatus.IN_PROGRESS:
            raise HTTPException(
                status_code=409,
                detail="Step is not currently in progress.",
            )

        step.status = TaskStepStatus.COMPLETED
        now = datetime.now(timezone.utc)
        task.last_activity_at = now

        # Find the next unfinished step, rather than assuming
        # positions are always contiguous.
        next_step = db.execute(
            select(TaskStep)
            .where(
                TaskStep.task_id == task.id,
                TaskStep.position > step.position,
                TaskStep.status.notin_([
                    TaskStepStatus.COMPLETED,
                    TaskStepStatus.SKIPPED,
                ]),
            )
            .order_by(TaskStep.position.asc())
        ).scalars().first()

        if next_step:
            FocusService._transition(
                task,
                FocusFSMAction.COMPLETE_STEP,
            )

            task.current_step_position = next_step.position
            next_step.status = TaskStepStatus.IN_PROGRESS

            db.commit()
            db.refresh(task)
            db.refresh(next_step)

            return TaskStepCompleteResponse(
                result=StepCompleteResultEnum.NEXT_STEP,
                task_id=task.id,
                completed_step_id=step.id,
                next_step_position=next_step.position,
                task_status=task.status,
                focus_state=task.focus_state,
                current_step=TaskStepResponse.model_validate(next_step),
            )

        # No unfinished steps remain.
        FocusService._transition(
            task,
            FocusFSMAction.COMPLETE_ALL_STEPS,
        )

        task.status = TaskStatus.COMPLETED
        task.current_step_position = None

        db.commit()
        db.refresh(task)

        return TaskStepCompleteResponse(
            result=StepCompleteResultEnum.TASK_COMPLETED,
            task_id=task.id,
            completed_step_id=step.id,
            next_step_position=None,
            task_status=task.status,
            focus_state=task.focus_state,
            current_step=None,
        )

    @staticmethod
    def handle_stuck(
        db: Session,
        task: Task,
        step_id: int,
        reason: str | StuckReasonEnum,
        expected_step_position: int,
        idempotency_key: str | None = None,
    ) -> StepStuckResponse:

        if task.focus_state != FocusState.ACTIVE:
            raise HTTPException(
                status_code=409,
                detail="Stuck adaptation is only allowed during an active session.",
            )

        if (
            task.current_step_position is None
            or task.current_step_position != expected_step_position
        ):
            raise HTTPException(
                status_code=409,
                detail="Stale step position.",
            )

        step = db.execute(
            select(TaskStep).where(
                TaskStep.id == step_id,
                TaskStep.task_id == task.id,
            )
        ).scalar_one_or_none()

        if not step or step.position != expected_step_position:
            raise HTTPException(
                status_code=404,
                detail="Current task step not found.",
            )

        reason_str = (
            reason.value if isinstance(reason, StuckReasonEnum)
            else str(reason).upper()
        )

        task.last_activity_at = datetime.now(timezone.utc)

        # Explicit break request or adaptation cap.
        if (
            reason_str == StuckReasonEnum.NEED_BREAK.value
        ):
            if task.break_started_at is not None:
                raise HTTPException(
                    status_code=409,
                    detail="The one allowed break for this task has already been used.",
                )

            task.break_started_at = datetime.now(timezone.utc)

            FocusService._transition(
                task,
                FocusFSMAction.TAKE_BREAK,
            )

            db.commit()
            db.refresh(task)

            message = "Taking a short break."

            return StepStuckResponse(
                outcome=StuckOutcomeEnum.BREAK,
                task_id=task.id,
                step_id=step.id,
                message=message,
                updated_step=TaskStepResponse.model_validate(step),
                new_steps=None,
                focus_state=task.focus_state,
            )

        if reason_str == StuckReasonEnum.TOO_LONG.value:
            new_steps = AIService.decompose_step(
                db,
                task,
                step,
                reason=reason_str,
                idempotency_key=idempotency_key,
            )

            db.refresh(task)

            return StepStuckResponse(
                outcome=StuckOutcomeEnum.DECOMPOSE,
                task_id=task.id,
                step_id=step.id,
                message="Step decomposed into smaller micro-steps.",
                updated_step=TaskStepResponse.model_validate(new_steps[0]),
                new_steps=[
                    TaskStepResponse.model_validate(item)
                    for item in new_steps
                ],
                focus_state=task.focus_state,
            )

        updated_step = AIService.refine_step(
            db,
            task,
            step,
            reason=reason_str,
            idempotency_key=idempotency_key,
        )

        db.refresh(task)

        return StepStuckResponse(
            outcome=StuckOutcomeEnum.REFINE,
            task_id=task.id,
            step_id=step.id,
            message="Step simplified and refined.",
            updated_step=TaskStepResponse.model_validate(updated_step),
            new_steps=None,
            focus_state=task.focus_state,
        )

    @staticmethod
    def take_break(db: Session, task: Task) -> Task:

        if task.break_started_at is not None:
            raise HTTPException(
                status_code=409,
                detail="The one allowed break for this task has already been used.",
            )

        if task.current_step_position is None:
            raise HTTPException(
                status_code=400,
                detail="No active step available for break.",
            )

        step = db.execute(
            select(TaskStep).where(
                TaskStep.task_id == task.id,
                TaskStep.position == task.current_step_position,
            )
        ).scalar_one_or_none()

        if not step:
            raise HTTPException(
                status_code=404,
                detail="Current task step not found.",
            )

        now = datetime.now(timezone.utc)

        FocusService._transition(
            task,
            FocusFSMAction.TAKE_BREAK,
        )

        task.break_started_at = now
        task.last_activity_at = now

        db.commit()
        db.refresh(task)

        return task
    
    @staticmethod
    def resume(db: Session, task: Task) -> Task:

        FocusService._transition(
            task,
            FocusFSMAction.RESUME,
        )

        now = datetime.now(timezone.utc)

        task.last_activity_at = now

        db.commit()
        db.refresh(task)

        return task
    
    @staticmethod
    def lets_go(db: Session, task: Task) -> Task:

        FocusService._transition(
            task,
            FocusFSMAction.LETS_GO,
        )

        task.last_activity_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(task)

        return task
    
    @staticmethod
    def mark_inactive_if_due(
        db: Session,
        task: Task,
        now: datetime | None = None,
    ) -> bool:
        """
        Transition ACTIVE -> INACTIVE when the inactivity threshold is reached.

        Returns True if the transition occurred, otherwise False.
        """

        if task.focus_state != FocusState.ACTIVE:
            return False

        if task.last_activity_at is None:
            return False

        now = now or datetime.now(timezone.utc)
        last_activity = task.last_activity_at

        # SQL databases may return naive timestamps for timezone-naive columns.
        if last_activity.tzinfo is None:
            last_activity = last_activity.replace(tzinfo=timezone.utc)

        elapsed = (now - last_activity).total_seconds()

        if elapsed < FocusService.INACTIVITY_THRESHOLD_SECONDS:
            return False

        FocusService._transition(
            task,
            FocusFSMAction.MARK_INACTIVE,
        )

        db.commit()
        db.refresh(task)

        return True
