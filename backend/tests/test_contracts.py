"""
Contract tests for the fixes made in Phase 1.

Covers:
- Task creation accepts the legacy frontend payload (scheduled_time,
  string priority, estimated_minutes, recurrence, reward_points).
- Child feedback persists the seven structured answers and is readable by
  the owning caregiver.
"""

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.child import Child
from app.models.child_ai_context import ChildAIContext
from app.models.task import Task, TaskStatus, FocusState
from app.models.task_step import TaskStep, TaskStepStatus
from app.models.user import User, UserRole
from tests.conftest import make_auth_header


def _setup(db: Session):
    caregiver = User(clerk_user_id="clerk_contract_cg", role=UserRole.CAREGIVER)
    child_user = User(clerk_user_id="clerk_contract_ch", role=UserRole.CHILD)
    db.add_all([caregiver, child_user])
    db.commit()

    child = Child(
        caregiver_id=caregiver.id,
        user_id=child_user.id,
        name="Contract Child",
        age=8,
        class_name="Class 3",
    )
    db.add(child)
    db.commit()

    return caregiver, child_user, child


def test_create_task_accepts_legacy_frontend_payload(
    client: TestClient, db_session: Session
):
    caregiver, _, child = _setup(db_session)
    headers = make_auth_header(caregiver.clerk_user_id)

    res = client.post(
        "/tasks",
        json={
            "child_id": child.id,
            "title": "Tidy your room",
            "scheduled_time": "2026-11-23T17:30:00",
            "priority": "NORMAL",
            "estimated_minutes": 20,
            "recurrence": "Daily",
            "reward_points": 20,
        },
        headers=headers,
    )

    assert res.status_code == 201, res.text
    body = res.json()
    assert body["priority"] == 2
    assert body["scheduled_at"] is not None
    assert body["estimated_minutes"] == 20
    assert body["recurrence"] == "Daily"
    assert body["reward_points"] == 20


def test_task_update_accepts_scheduled_time_alias(
    client: TestClient, db_session: Session
):
    caregiver, _, child = _setup(db_session)
    headers = make_auth_header(caregiver.clerk_user_id)

    task = Task(
        child_id=child.id,
        title="Update me",
        status=TaskStatus.PENDING,
        focus_state=FocusState.INITIATED,
    )
    db_session.add(task)
    db_session.commit()

    res = client.patch(
        f"/tasks/{task.id}",
        json={"scheduled_time": "2026-11-24T10:00:00", "priority": "HIGH"},
        headers=headers,
    )

    assert res.status_code == 200, res.text
    body = res.json()
    assert body["priority"] == 3
    assert body["scheduled_at"] is not None


def test_feedback_persists_seven_fields_and_is_readable(
    client: TestClient, db_session: Session
):
    caregiver, child_user, child = _setup(db_session)
    task = Task(
        child_id=child.id,
        title="Feedback task",
        status=TaskStatus.COMPLETED,
        focus_state=FocusState.COMPLETED,
    )
    db_session.add(task)
    db_session.commit()

    child_headers = make_auth_header(child_user.clerk_user_id)
    res = client.post(
        f"/tasks/{task.id}/feedback",
        json={
            "task_difficulty": "JUST_OKAY",
            "hardest_part": "GETTING_STARTED",
            "helped_by": "SMALL_STEPS",
            "instruction_clarity": "VERY_CLEAR",
            "focus_level": "MOST_OF_THE_TIME",
            "when_stuck": "TRIED_AGAIN",
            "next_time": "SMALLER_STEPS",
        },
        headers=child_headers,
    )

    assert res.status_code == 201, res.text
    body = res.json()
    assert body["helped_by"] == "SMALL_STEPS"
    assert body["task_difficulty"] == "JUST_OKAY"

    caregiver_headers = make_auth_header(caregiver.clerk_user_id)
    listed = client.get(
        f"/children/{child.id}/feedback", headers=caregiver_headers
    )
    assert listed.status_code == 200, listed.text
    assert len(listed.json()) == 1


def test_helped_by_preferences_are_derived(
    client: TestClient, db_session: Session
):
    _, child_user, child = _setup(db_session)
    child_headers = make_auth_header(child_user.clerk_user_id)

    for title in ("Feedback one", "Feedback two"):
        task = Task(
            child_id=child.id,
            title=title,
            status=TaskStatus.COMPLETED,
            focus_state=FocusState.COMPLETED,
        )
        db_session.add(task)
        db_session.commit()

        res = client.post(
            f"/tasks/{task.id}/feedback",
            json={"helped_by": "SMALL_STEPS"},
            headers=child_headers,
        )
        assert res.status_code == 201, res.text

    context = db_session.query(ChildAIContext).filter_by(child_id=child.id).one()
    assert "small steps" in context.preferences.lower()


def test_progress_endpoints_are_enabled_and_recompute_summary(
    client: TestClient, db_session: Session
):
    caregiver, _, child = _setup(db_session)
    headers = make_auth_header(caregiver.clerk_user_id)

    now = datetime.now(timezone.utc)
    task = Task(
        child_id=child.id,
        title="Progress task",
        status=TaskStatus.COMPLETED,
        focus_state=FocusState.COMPLETED,
        last_activity_at=now,
    )
    db_session.add(task)
    db_session.commit()

    db_session.add(
        TaskStep(
            task_id=task.id,
            position=1,
            description="Step one",
            estimated_minutes=5,
            status=TaskStepStatus.COMPLETED,
        )
    )
    db_session.commit()

    summary = client.get("/progress/summary", headers=headers)
    assert summary.status_code == 200, summary.text
    body = summary.json()
    assert body["tasks_total"] == 1
    assert body["tasks_completed"] == 1
    assert body["steps_completed"] == 1
    assert body["completion_rate"] == 1.0

    streak = client.get("/progress/streak", headers=headers)
    assert streak.status_code == 200, streak.text
    assert streak.json()["current_streak"] >= 1

    full = client.get("/progress", headers=headers)
    assert full.status_code == 200, full.text
    assert full.json()["tasks_completed"] == 1
