"""
Test suite for AI Task Breakdown, Step Adaptation, AI Validators, and Guardrails.
Covers AI breakdown generation, idempotency, caching, schema validation, and input/output safety checks.
"""

import uuid
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.ai.prompts import (
    BREAKDOWN_SYSTEM_PROMPT,
    BREAKDOWN_USER_PROMPT,
)
from app.ai.validators import (
    validate_breakdown_output,
    validate_adapted_step_output,
    validate_decomposed_steps_output,
)
from app.guardrails.guardrails_service import GuardrailsService
from app.models.child import Child
from app.models.task import Task
from app.models.task_step import TaskStep
from app.models.user import User
from tests.conftest import FakeGuardrails, make_auth_header


# ---------------------------------------------------------------------------
# AI Breakdown API Tests
# ---------------------------------------------------------------------------

def test_task_breakdown_success(client: TestClient, caregiver: User, child: Child, db: Session):
    """Caregiver triggers initial AI breakdown; steps are created and returned."""
    task = Task(
        child_id=child.id,
        title="Build Lego Castle",
        description="Follow instructions to assemble brick towers",
    )
    db.add(task)
    db.commit()

    headers = make_auth_header(caregiver.clerk_user_id)
    response = client.post(f"/tasks/{task.id}/breakdown", headers=headers)
    assert response.status_code == 200
    steps = response.json()
    assert len(steps) >= 2
    assert steps[0]["position"] == 1
    assert steps[0]["description"] is not None
    assert steps[0]["estimated_minutes"] > 0

    # Verify steps saved in database
    db_steps = db.query(TaskStep).filter_by(task_id=task.id).order_by(TaskStep.position.asc()).all()
    assert len(db_steps) == len(steps)


def test_duplicate_initial_breakdown_gives_409(
    client: TestClient, caregiver: User, child: Child, db: Session
):
    """Attempting breakdown on a task that already has steps returns 409 Conflict."""
    task = Task(child_id=child.id, title="Already Broken Down Task")
    db.add(task)
    db.commit()

    step = TaskStep(task_id=task.id, position=1, description="Existing Step", estimated_minutes=3)
    db.add(step)
    db.commit()

    headers = make_auth_header(caregiver.clerk_user_id)
    response = client.post(f"/tasks/{task.id}/breakdown", headers=headers)
    assert response.status_code == 409
    assert "already has steps" in response.json()["detail"].lower()


def test_breakdown_idempotency_key_support(
    client: TestClient, caregiver: User, child: Child, db: Session
):
    """Providing the same Idempotency-Key returns stored breakdown steps without re-generating."""
    task = Task(child_id=child.id, title="Idempotent Task")
    db.add(task)
    db.commit()

    key = f"idem-key-{uuid.uuid4().hex}"
    headers = {
        **make_auth_header(caregiver.clerk_user_id),
        "Idempotency-Key": key,
    }

    # Initial call
    res1 = client.post(f"/tasks/{task.id}/breakdown", headers=headers)
    assert res1.status_code == 200
    steps1 = res1.json()

    # Re-call with identical idempotency key
    res2 = client.post(f"/tasks/{task.id}/breakdown", headers=headers)
    assert res2.status_code == 200
    steps2 = res2.json()

    assert len(steps1) == len(steps2)
    assert [s["id"] for s in steps1] == [s["id"] for s in steps2]


# ---------------------------------------------------------------------------
# AI Validator Unit Tests
# ---------------------------------------------------------------------------

def test_validate_breakdown_output():
    """validate_breakdown_output accepts valid step lists (3-5 steps, 1-4 mins) and rejects invalid structures."""
    valid_data = {
        "steps": [
            {"description": "Gather materials", "estimated_minutes": 2},
            {"description": "Assemble parts", "estimated_minutes": 3},
            {"description": "Review results", "estimated_minutes": 2},
        ]
    }
    validated = validate_breakdown_output(valid_data)
    assert len(validated.steps) == 3
    assert validated.steps[0].description == "Gather materials"

    # Missing steps key raises ValueError
    with pytest.raises(Exception):
        validate_breakdown_output({"wrong_key": []})

    # Empty steps list raises ValueError
    with pytest.raises(Exception):
        validate_breakdown_output({"steps": []})


def test_validate_adapted_step_output():
    """validate_adapted_step_output checks single step refinement payload."""
    valid_data = {"description": "Step refined", "estimated_minutes": 3}
    validated = validate_adapted_step_output(valid_data)
    assert validated.description == "Step refined"
    assert validated.estimated_minutes == 3

    with pytest.raises(Exception):
        validate_adapted_step_output({"estimated_minutes": 3})


def test_validate_decomposed_steps_output():
    """validate_decomposed_steps_output verifies decomposition into exactly 2 steps."""
    valid_data = {
        "steps": [
            {"description": "Part 1", "estimated_minutes": 2},
            {"description": "Part 2", "estimated_minutes": 2},
        ]
    }
    validated = validate_decomposed_steps_output(valid_data)
    assert len(validated) == 2

    with pytest.raises(Exception):
        validate_decomposed_steps_output({"steps": []})


# ---------------------------------------------------------------------------
# Guardrails Service Unit Tests
# ---------------------------------------------------------------------------

def test_guardrails_check_input_safety(monkeypatch):
    """GuardrailsService.check_input blocks unsafe input and allows safe text."""
    # Case 1: Rail allows safe input (default FakeGuardrails has blocked=False)
    monkeypatch.setattr(
        "app.guardrails.guardrails_service.get_guardrails",
        lambda: FakeGuardrails(blocked=False),
    )
    GuardrailsService.check_input("Clean up toys and books")

    # Case 2: Rail blocks unsafe input
    monkeypatch.setattr(
        "app.guardrails.guardrails_service.get_guardrails",
        lambda: FakeGuardrails(blocked=True),
    )
    with pytest.raises(HTTPException) as exc:
        GuardrailsService.check_input("Harmful unsafe text")
    assert exc.value.status_code == 400
    assert "safety policies" in exc.value.detail.lower()

    # Case 3: Unexpected error in rails raises 503
    def broken_rails():
        raise RuntimeError("Service failure")

    monkeypatch.setattr("app.guardrails.guardrails_service.get_guardrails", broken_rails)
    with pytest.raises(HTTPException) as exc_503:
        GuardrailsService.check_input("Any text")
    assert exc_503.value.status_code == 503


def test_guardrails_check_output_safety(monkeypatch):
    """GuardrailsService.check_output raises 502 when AI output is blocked."""
    # Case 1: Allows safe output
    monkeypatch.setattr(
        "app.guardrails.guardrails_service.get_guardrails",
        lambda: FakeGuardrails(blocked=False),
    )
    GuardrailsService.check_output("Safe step instructions")

    # Case 2: Blocks unsafe output -> 502
    monkeypatch.setattr(
        "app.guardrails.guardrails_service.get_guardrails",
        lambda: FakeGuardrails(blocked=True),
    )
    with pytest.raises(HTTPException) as exc:
        GuardrailsService.check_output("Unsafe AI response")
    assert exc.value.status_code == 502
    assert "safety validation" in exc.value.detail.lower()


# ---------------------------------------------------------------------------
# Prompt Templates Unit Tests
# ---------------------------------------------------------------------------

def test_prompt_formatting():
    """Ensure system and user prompt templates format correctly without key errors."""
    assert "ADHD" in BREAKDOWN_SYSTEM_PROMPT
    user_prompt = BREAKDOWN_USER_PROMPT.format(
        title="Fold Laundry",
        description="Fold clean clothes from dryer",
        age=10,
        preferences="Likes short timers",
    )
    assert "Fold Laundry" in user_prompt
    assert "10" in user_prompt
    assert "short timers" in user_prompt
