"""
AIService: handles task breakdown, step refinement, and step decomposition using the AIProvider abstraction.
Supports idempotency, child-scoped response caching, and PostgreSQL-backed AI quotas.
"""

import logging
import hashlib
import json
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.guardrails.guardrails_service import GuardrailsService
from app.core.config import settings
from app.core.redis import (get_idempotent_result, store_idempotent_result, get_ai_response_cache, store_ai_response_cache)
from app.models.task import Task
from app.models.ai_usage_daily import AIUsageDaily
from app.models.task_step import TaskStep, TaskStepStatus
from app.models.child import Child
from app.models.child_ai_context import ChildAIContext
from app.ai.provider import AIProvider
from app.ai.openai_provider import OpenAIProvider
from app.ai.ollama_provider import OllamaProvider
from app.ai.prompts import (
    BREAKDOWN_SYSTEM_PROMPT,
    BREAKDOWN_USER_PROMPT,
    REFINE_SYSTEM_PROMPT,
    REFINE_USER_PROMPT,
    DECOMPOSE_SYSTEM_PROMPT,
    DECOMPOSE_USER_PROMPT,
)
from app.ai.validators import (
    validate_breakdown_output,
    validate_adapted_step_output,
    validate_decomposed_steps_output,
)
from app.schemas.ai import AITaskBreakdown, AIAdaptedStep, AITaskStep

logger = logging.getLogger(__name__)


def get_ai_provider() -> AIProvider:
    """Instantiate the configured AI provider."""
    provider = settings.AI_PROVIDER.lower()
    if provider == "ollama":
        return OllamaProvider()
    if provider == "openai":
        return OpenAIProvider()
    raise ValueError(f"Unsupported AI provider: {provider}")



class AIService:
    @staticmethod
    def _breakdown_cache_key(
        child_id: int, title: str, description: str, age: int, preferences: str
    ) -> str:
        """Child-scoped exact-match cache; never shared across children."""
        payload = {
            "child_id": child_id,
            "title": " ".join((title or "").lower().split()),
            "description": " ".join((description or "").lower().split()),
            "age": age,
            "preferences": " ".join((preferences or "").lower().split()),
            "provider": settings.AI_PROVIDER,
            "model": (
                settings.OLLAMA_MODEL if settings.AI_PROVIDER.lower() == "ollama"
                else settings.OPENAI_MODEL
            ),
            "prompt_version": settings.AI_PROMPT_VERSION,
        }
        raw = json.dumps(payload, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    @staticmethod
    def _reserve_daily_breakdown(db: Session, caregiver_id: int) -> None:
        """Atomically reserve one caregiver breakdown for the current UTC day."""
        today = datetime.now(timezone.utc).date()
        limit = settings.AI_BREAKDOWN_DAILY_LIMIT
        stmt = (
            pg_insert(AIUsageDaily)
            .values(caregiver_id=caregiver_id, usage_date=today, breakdown_count=1)
            .on_conflict_do_update(
                constraint="uq_ai_usage_daily_caregiver_date",
                set_={"breakdown_count": AIUsageDaily.breakdown_count + 1},
                where=AIUsageDaily.breakdown_count < limit,
            )
            .returning(AIUsageDaily.breakdown_count)
        )
        reserved = db.execute(stmt).scalar_one_or_none()
        if reserved is None:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Daily AI breakdown limit reached ({limit} per caregiver).",
            )

    @staticmethod
    def breakdown_task(
        db: Session,
        task: Task,
        idempotency_key: str | None = None,
    ) -> list[TaskStep]:
        """
        POST /tasks/{task_id}/breakdown:
        Initial breakdown is allowed ONLY when the task has no existing TaskSteps.
        If TaskSteps already exist -> 409 Conflict.
        """
        # Idempotency check
        if idempotency_key:
            cached = get_idempotent_result(
                f"breakdown:{task.id}:{idempotency_key}"
            )
            if cached:
                step_ids = cached.get("step_ids", [])
                return list(
                    db.execute(
                        select(TaskStep)
                        .where(TaskStep.id.in_(step_ids))
                        .order_by(TaskStep.position.asc())
                    ).scalars().all()
                )

        # Serialize initial breakdowns for this task.
        task = db.execute(
            select(Task).where(Task.id == task.id).with_for_update()
        ).scalar_one()

        # Check existing steps
        existing_steps = db.execute(
            select(TaskStep).where(TaskStep.task_id == task.id)
        ).scalars().all()

        if existing_steps:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Task already has steps. Initial breakdown is only allowed when no steps exist.",
            )

        # Retrieve Child info & context
        child = db.execute(
            select(Child).where(Child.id == task.child_id)
        ).scalar_one_or_none()

        age = child.age if child else 8
        context = db.execute(
            select(ChildAIContext).where(ChildAIContext.child_id == task.child_id)
        ).scalar_one_or_none()
        preferences = context.preferences if context else ""
        caregiver_id = child.caregiver_id if child else None
        if caregiver_id is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not resolve the caregiver for this task.",
            )

        # Reserve the daily quota in PostgreSQL. The transaction commits with
        # the new TaskStep rows, so failed generation does not consume quota.
        AIService._reserve_daily_breakdown(db, caregiver_id)

        cache_key = AIService._breakdown_cache_key(
            task.child_id, task.title, task.description or "", age, preferences
        )
        cached_template = get_ai_response_cache(cache_key)

        GuardrailsService.check_input(
            f"Task title: {task.title}\n"
            f"Task description: {task.description or ''}\n"
            f"Child preferences: {preferences}"
        )
        user_prompt = BREAKDOWN_USER_PROMPT.format(
            title=task.title,
            description=task.description or "",
            age=age,
            preferences=preferences,
        )

        breakdown_data: AITaskBreakdown | None = None

        if cached_template:
            breakdown_data = validate_breakdown_output(cached_template)
        else:
            try:
                provider = get_ai_provider()
                raw = provider.generate_json(BREAKDOWN_SYSTEM_PROMPT, user_prompt)
                breakdown_data = validate_breakdown_output(raw)
            except Exception as first_error:
                logger.warning("AI breakdown attempt 1 failed: %s. Retrying once...", first_error)
                try:
                    provider = get_ai_provider()
                    raw = provider.generate_json(BREAKDOWN_SYSTEM_PROMPT, user_prompt)
                    breakdown_data = validate_breakdown_output(raw)
                except Exception as retry_error:
                    logger.error(
                        "AI breakdown retry failed: %s. Using deterministic fallback.",
                        retry_error,
                    )
                    breakdown_data = AITaskBreakdown(
                        steps=[
                            AITaskStep(
                                description=f"Start by preparing what you need for {task.title}",
                                estimated_minutes=3,
                            ),
                            AITaskStep(
                                description=f"Work on the next small part of {task.title}",
                                estimated_minutes=3,
                            ),
                            AITaskStep(
                                description=f"Check and finish {task.title}",
                                estimated_minutes=3,
                            ),
                        ]
                    )
            # Cache only the reusable template, never TaskStep IDs.
            store_ai_response_cache(
                cache_key,
                breakdown_data.model_dump(),
                ttl=settings.AI_RESPONSE_CACHE_TTL_SECONDS,
            )

        GuardrailsService.check_output(
        "\n".join(step.description for step in breakdown_data.steps)
        )
        # Persist generated steps
        created_steps: list[TaskStep] = []
        for idx, step_item in enumerate(breakdown_data.steps, start=1):
            step = TaskStep(
                task_id=task.id,
                position=idx,
                description=step_item.description,
                estimated_minutes=step_item.estimated_minutes,
                status=TaskStepStatus.PENDING,
                adaptation_count=0,
            )
            db.add(step)
            created_steps.append(step)

        # Set task current_step_position to 1 if not set
        if task.current_step_position is None:
            task.current_step_position = 1

        db.commit()

        for s in created_steps:
            db.refresh(s)

        if idempotency_key:
            store_idempotent_result(
                f"breakdown:{task.id}:{idempotency_key}",
                {"step_ids": [s.id for s in created_steps]},
            )

        return created_steps

    @staticmethod
    def refine_step(
        db: Session,
        task: Task,
        step: TaskStep,
        reason: str = "TOO_HARD",
        idempotency_key: str | None = None,
    ) -> TaskStep:
        """
        POST /tasks/{task_id}/steps/{step_id}/refine (Internal/orchestrated).
        Refines a single step to make it easier/simpler.
        Maximum 1 refinement across the entire task.
        """
        if idempotency_key:
            cached = get_idempotent_result(f"refine:{step.id}:{idempotency_key}")
            if cached:
                db.refresh(step)
                return step
        GuardrailsService.check_input(
            f"Current step: {step.description}\n"
            f"Reason for adaptation: {reason}"
        )
        # Lock the task row so concurrent requests cannot exceed the task-wide cap.
        locked_task = db.execute(
            select(Task).where(Task.id == task.id).with_for_update()
        ).scalar_one()
        if locked_task.refinement_count >= 1:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="This task has already used its one allowed refinement.",
            )

        child = db.execute(
            select(Child).where(Child.id == task.child_id)
        ).scalar_one_or_none()
        age = child.age if child else 8
        context = db.execute(
            select(ChildAIContext).where(ChildAIContext.child_id == task.child_id)
        ).scalar_one_or_none()
        preferences = context.preferences if context else ""

        user_prompt = REFINE_USER_PROMPT.format(
            step_description=step.description,
            estimated_minutes=step.estimated_minutes,
            reason=reason,
            age=age,
            preferences=preferences,
        )

        try:
            provider = get_ai_provider()
            raw = provider.generate_json(REFINE_SYSTEM_PROMPT, user_prompt)
            adapted = validate_adapted_step_output(raw)
            step.description = adapted.description
            step.estimated_minutes = adapted.estimated_minutes
        except Exception as e:
            logger.warning(f"AI refine failed: {e}. Retrying once...")
            try:
                provider = get_ai_provider()
                raw = provider.generate_json(REFINE_SYSTEM_PROMPT, user_prompt)
                adapted = validate_adapted_step_output(raw)
                step.description = adapted.description
                step.estimated_minutes = adapted.estimated_minutes
            except Exception as retry_error:
                logger.exception(
                    "AI refinement failed after retry for step %s",
                    step.id,
                )
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="AI refinement failed after retry. Check the backend logs.",
                ) from retry_error
        GuardrailsService.check_output(step.description)
        step.adaptation_count += 1  # legacy per-step metric only
        locked_task.refinement_count += 1
        db.commit()
        db.refresh(step)

        if idempotency_key:
            store_idempotent_result(
                f"refine:{step.id}:{idempotency_key}",
                {"step_id": step.id, "description": step.description},
            )

        return step

    @staticmethod
    def decompose_step(
        db: Session,
        task: Task,
        step: TaskStep,
        reason: str = "TOO_LONG",
        idempotency_key: str | None = None,
    ) -> list[TaskStep]:
        """
        POST /tasks/{task_id}/steps/{step_id}/decompose (Internal/orchestrated).
        Splits a step into 2 smaller micro-steps.
        Maximum 2 decompositions across the entire task.
        """
        if idempotency_key:
            cached = get_idempotent_result(
                f"decompose:{step.id}:{idempotency_key}"
            )
            if cached:
                step_ids = cached.get("new_step_ids", [])
                return list(
                    db.execute(
                        select(TaskStep)
                        .where(TaskStep.id.in_(step_ids))
                        .order_by(TaskStep.position.asc())
                    ).scalars().all()
                )
        GuardrailsService.check_input(
            f"Current step: {step.description}\n"
            f"Reason for decomposition: {reason}"
        )
        locked_task = db.execute(
            select(Task).where(Task.id == task.id).with_for_update()
        ).scalar_one()
        if locked_task.decomposition_count >= 2:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="This task has used both allowed decompositions.",
            )

        child = db.execute(
            select(Child).where(Child.id == task.child_id)
        ).scalar_one_or_none()
        age = child.age if child else 8
        context = db.execute(
            select(ChildAIContext).where(ChildAIContext.child_id == task.child_id)
        ).scalar_one_or_none()
        preferences = context.preferences if context else ""
        user_prompt = DECOMPOSE_USER_PROMPT.format(
            step_description=step.description,
            reason=reason,
            age=age,
            preferences=preferences,
        )

        try:
            provider = get_ai_provider()
            raw = provider.generate_json(DECOMPOSE_SYSTEM_PROMPT, user_prompt)
            decomposed_items = validate_decomposed_steps_output(raw)
        except Exception as e:
            logger.warning(f"AI decompose failed: {e}. Retrying once...")
            try:
                provider = get_ai_provider()
                raw = provider.generate_json(DECOMPOSE_SYSTEM_PROMPT, user_prompt)
                decomposed_items = validate_decomposed_steps_output(raw)
            except Exception as retry_error:
                logger.exception(
                    "AI decomposition failed after retry for step %s",
                    step.id,
                )
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="AI decomposition failed after retry. Check the backend logs.",
                ) from retry_error
        GuardrailsService.check_output(
            "\n".join(item.description for item in decomposed_items)
        )
        # Shift downstream steps right by (len(decomposed_items) - 1)
        original_position = step.position
        all_steps = list(
            db.execute(
                select(TaskStep)
                .where(TaskStep.task_id == task.id)
                .order_by(TaskStep.position.asc())
            ).scalars().all()
        )

        # Replace original step and re-index positions
        new_steps: list[TaskStep] = []
        # Update original step to first decomposed step
        step.description = decomposed_items[0].description
        step.estimated_minutes = decomposed_items[0].estimated_minutes
        step.adaptation_count += 1  # legacy per-step metric only
        locked_task.decomposition_count += 1
        new_steps.append(step)

        # Insert remaining decomposed steps
        shift = len(decomposed_items) - 1
        for s in all_steps:
            if s.position > original_position:
                s.position += shift

        for idx, sub_item in enumerate(decomposed_items[1:], start=1):
            inserted_step = TaskStep(
                task_id=task.id,
                position=original_position + idx,
                description=sub_item.description,
                estimated_minutes=sub_item.estimated_minutes,
                status=TaskStepStatus.PENDING,
                adaptation_count=step.adaptation_count,
            )
            db.add(inserted_step)
            new_steps.append(inserted_step)

        db.commit()
        for ns in new_steps:
            db.refresh(ns)

        if idempotency_key:
            store_idempotent_result(
                f"decompose:{step.id}:{idempotency_key}",
                {"new_step_ids": [ns.id for ns in new_steps]},
            )

        return new_steps
