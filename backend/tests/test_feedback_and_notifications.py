"""
Test suite for Child Post-Task Feedback, Preference Adaptation, Notifications, and Telemetry.
Covers 7-field feedback submission, ChildAIContext adaptation, notification lifecycle on
task scheduling/rescheduling/deletion, and batch telemetry with deduplication.
"""

from datetime import datetime, timedelta, timezone
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.child import Child
from app.models.child_ai_context import ChildAIContext
from app.models.feedback import Feedback
from app.models.notification import Notification, NotificationStatus, NotificationType
from app.models.task import FocusState, Task, TaskStatus
from app.models.user import User
from tests.conftest import make_auth_header


# ---------------------------------------------------------------------------
# Feedback & AI Preferences Adaptation Tests
# ---------------------------------------------------------------------------

def test_child_feedback_persists_seven_fields(
    client: TestClient, child_user: User, child: Child, db: Session
):
    """Child submits post-task feedback containing the authoritative 7 structured fields."""
    task = Task(
        child_id=child.id,
        title="Completed Assignment",
        status=TaskStatus.COMPLETED,
        focus_state=FocusState.COMPLETED,
    )
    db.add(task)
    db.commit()

    headers = make_auth_header(child_user.clerk_user_id)
    feedback_payload = {
        "task_difficulty": "JUST_OKAY",
        "hardest_part": "GETTING_STARTED",
        "helped_by": "SMALL_STEPS",
        "instruction_clarity": "VERY_CLEAR",
        "focus_level": "MOST_OF_THE_TIME",
        "when_stuck": "TRIED_AGAIN",
        "next_time": "SMALLER_STEPS",
    }
    response = client.post(f"/tasks/{task.id}/feedback", json=feedback_payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["task_id"] == task.id
    assert data["child_id"] == child.id
    assert data["task_difficulty"] == "JUST_OKAY"
    assert data["helped_by"] == "SMALL_STEPS"
    assert data["instruction_clarity"] == "VERY_CLEAR"


def test_feedback_adapts_child_ai_context_preferences(
    client: TestClient, child_user: User, child: Child, db: Session
):
    """Repeated feedback submissions with helped_by derive and persist AI context preferences."""
    headers = make_auth_header(child_user.clerk_user_id)

    for i in range(2):
        task = Task(
            child_id=child.id,
            title=f"Task {i}",
            status=TaskStatus.COMPLETED,
            focus_state=FocusState.COMPLETED,
        )
        db.add(task)
        db.commit()

        res = client.post(
            f"/tasks/{task.id}/feedback",
            json={"helped_by": "SMALL_STEPS"},
            headers=headers,
        )
        assert res.status_code == 201

    context = db.query(ChildAIContext).filter_by(child_id=child.id).one_or_none()
    assert context is not None
    assert "small steps" in context.preferences.lower()


def test_caregiver_reads_child_feedback_and_isolation(
    client: TestClient, caregiver: User, caregiver2: User, child: Child, db: Session
):
    """Owning caregiver can view their child's feedback; unrelated caregiver cannot (404/403)."""
    task = Task(child_id=child.id, title="Feedback Task")
    db.add(task)
    db.commit()

    feedback = Feedback(
        child_id=child.id,
        task_id=task.id,
        helped_by="TIMER",
        task_difficulty="EASY",
    )
    db.add(feedback)
    db.commit()

    # Owning caregiver -> 200
    cg1_headers = make_auth_header(caregiver.clerk_user_id)
    res_cg1 = client.get(f"/children/{child.id}/feedback", headers=cg1_headers)
    assert res_cg1.status_code == 200
    items = res_cg1.json()
    assert len(items) >= 1
    assert items[0]["helped_by"] == "TIMER"

    # Unrelated caregiver -> 404
    cg2_headers = make_auth_header(caregiver2.clerk_user_id)
    res_cg2 = client.get(f"/children/{child.id}/feedback", headers=cg2_headers)
    assert res_cg2.status_code == 404


# ---------------------------------------------------------------------------
# Notifications Lifecycle Tests
# ---------------------------------------------------------------------------

def test_notification_lifecycle_on_task_schedule_update_and_delete(
    client: TestClient, caregiver: User, child: Child, db: Session
):
    """Task schedule changes update notification time, and deletion cancels notification."""
    headers = make_auth_header(caregiver.clerk_user_id)
    initial_sched = datetime.now(timezone.utc) + timedelta(hours=2)

    # 1. Create scheduled task
    res_create = client.post(
        "/tasks",
        json={
            "child_id": child.id,
            "title": "Scheduled Study Session",
            "scheduled_at": initial_sched.isoformat(),
        },
        headers=headers,
    )
    assert res_create.status_code == 201
    task_id = res_create.json()["id"]

    notif = db.query(Notification).filter_by(task_id=task_id, status=NotificationStatus.PENDING).first()
    assert notif is not None

    # 2. Reschedule task
    updated_sched = initial_sched + timedelta(hours=1)
    res_patch = client.patch(
        f"/tasks/{task_id}",
        json={"scheduled_at": updated_sched.isoformat()},
        headers=headers,
    )
    assert res_patch.status_code == 200

    db.refresh(notif)
    # Check that scheduled_at was updated properly
    assert abs((notif.scheduled_at.replace(tzinfo=timezone.utc) - updated_sched).total_seconds()) < 2

    # 3. Delete task -> notification becomes CANCELLED
    client.delete(f"/tasks/{task_id}", headers=headers)
    db.refresh(notif)
    assert notif.status == NotificationStatus.CANCELLED


def test_list_user_notifications(
    client: TestClient, caregiver: User, child: Child, db: Session
):
    """GET /notifications lists notifications accessible to the authenticated user."""
    notif = Notification(
        user_id=caregiver.id,
        child_id=child.id,
        type=NotificationType.TASK_REMINDER,
        message="Time to start homework",
        scheduled_at=datetime.now(timezone.utc),
        status=NotificationStatus.PENDING,
    )
    db.add(notif)
    db.commit()

    headers = make_auth_header(caregiver.clerk_user_id)
    response = client.get("/notifications", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["message"] == "Time to start homework"


# ---------------------------------------------------------------------------
# Telemetry Batch & Deduplication Tests
# ---------------------------------------------------------------------------

def test_telemetry_batch_and_deduplication(
    client: TestClient, child_user: User, child: Child
):
    """Telemetry records batches and cleanly ignores duplicate event_id entries."""
    headers = make_auth_header(child_user.clerk_user_id)
    event_id = f"evt-{uuid.uuid4().hex}"

    # Batch with duplicate inside same request
    payload = {
        "events": [
            {"event_id": event_id, "event_type": "TASK_STARTED", "child_id": child.id},
            {"event_id": event_id, "event_type": "TASK_STARTED", "child_id": child.id},
        ]
    }
    res1 = client.post("/telemetry/events", json=payload, headers=headers)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["recorded"] == 1
    assert data1["ignored_duplicates"] == 1

    # Resending the same event in subsequent request is ignored
    res2 = client.post("/telemetry/events", json=payload, headers=headers)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["recorded"] == 0
    assert data2["ignored_duplicates"] == 2


def test_telemetry_rate_limiting(client: TestClient, child_user: User, monkeypatch):
    """Exceeding telemetry rate limit returns 429 Too Many Requests."""
    headers = make_auth_header(child_user.clerk_user_id)

    # Monkeypatch check_rate_limit to return False
    monkeypatch.setattr("app.api.telemetry_routes.check_rate_limit", lambda *args, **kwargs: False)

    payload = {
        "events": [
            {"event_id": f"evt-{uuid.uuid4().hex}", "event_type": "BUTTON_CLICKED"},
        ]
    }
    response = client.post("/telemetry/events", json=payload, headers=headers)
    assert response.status_code == 429
    assert "rate limit exceeded" in response.json()["detail"].lower()
