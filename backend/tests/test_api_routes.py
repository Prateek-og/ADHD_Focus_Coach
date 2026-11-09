"""
Comprehensive test suite verifying all 15 API route contract criteria.
"""

from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.models.child import Child
from app.models.task import Task, TaskStatus, FocusState
from app.models.task_step import TaskStep, TaskStepStatus
from app.models.notification import Notification, NotificationStatus
from app.models.device import Device
from app.models.telemetry import TelemetryEvent
from tests.conftest import make_auth_header


def setup_users_and_children(db: Session):
    # Caregiver 1
    c1_user = User(clerk_user_id="clerk_cg_1", role=UserRole.CAREGIVER)
    # Caregiver 2
    c2_user = User(clerk_user_id="clerk_cg_2", role=UserRole.CAREGIVER)
    # Child 1 (linked to CG 1)
    ch1_user = User(clerk_user_id="clerk_ch_1", role=UserRole.CHILD)
    # Child 2 (linked to CG 2)
    ch2_user = User(clerk_user_id="clerk_ch_2", role=UserRole.CHILD)

    db.add_all([c1_user, c2_user, ch1_user, ch2_user])
    db.commit()

    child1 = Child(caregiver_id=c1_user.id, user_id=ch1_user.id, name="Child One", age=8, class_name="3rd Grade")
    child2 = Child(caregiver_id=c2_user.id, user_id=ch2_user.id, name="Child Two", age=10, class_name="5th Grade")

    db.add_all([child1, child2])
    db.commit()

    return {
        "cg1": c1_user,
        "cg2": c2_user,
        "ch1_user": ch1_user,
        "ch2_user": ch2_user,
        "child1": child1,
        "child2": child2,
    }


def test_1_and_2_role_access_and_403(client: TestClient, db_session: Session):
    """1. Correct role can access endpoint. 2. Incorrect role receives 403."""
    setup = setup_users_and_children(db_session)
    cg_headers = make_auth_header(setup["cg1"].clerk_user_id)
    ch_headers = make_auth_header(setup["ch1_user"].clerk_user_id)

    # Caregiver creating a child -> 201
    res = client.post("/children", json={"name": "New Child", "age": 7, "class_name": "2nd Grade"}, headers=cg_headers)
    assert res.status_code == 201

    # Child trying to create a child -> 403
    res_child = client.post("/children", json={"name": "Forbidden Child", "age": 7, "class_name": "2nd Grade"}, headers=ch_headers)
    assert res_child.status_code == 403


def test_3_resource_ownership_protection(client: TestClient, db_session: Session):
    """3. User cannot access another user's/child's resources."""
    setup = setup_users_and_children(db_session)
    cg2_headers = make_auth_header(setup["cg2"].clerk_user_id)

    # CG2 trying to access Child 1 (owned by CG1) -> 403
    res = client.get(f"/children/{setup['child1'].id}", headers=cg2_headers)
    assert res.status_code == 403


def test_4_missing_resource_gives_404(client: TestClient, db_session: Session):
    """4. Missing resource gives 404."""
    setup = setup_users_and_children(db_session)
    cg_headers = make_auth_header(setup["cg1"].clerk_user_id)

    res = client.get("/children/999999", headers=cg_headers)
    assert res.status_code == 404


def test_5_stale_expected_step_position_gives_409(client: TestClient, db_session: Session):
    """5. Stale expected_step_position gives 409."""
    setup = setup_users_and_children(db_session)
    ch1_headers = make_auth_header(setup["ch1_user"].clerk_user_id)

    task = Task(child_id=setup["child1"].id, title="Test Task", current_step_position=2, focus_state=FocusState.ACTIVE)
    db_session.add(task)
    db_session.commit()

    step = TaskStep(task_id=task.id, position=2, description="Step 2", estimated_minutes=3)
    db_session.add(step)
    db_session.commit()

    # Sending wrong expected_step_position (1 instead of 2) -> 409 Conflict
    res = client.post(
        f"/tasks/{task.id}/steps/{step.id}/complete",
        json={"expected_step_position": 1},
        headers=ch1_headers,
    )
    assert res.status_code == 409


def test_6_duplicate_initial_breakdown_gives_409(client: TestClient, db_session: Session):
    """6. Duplicate initial breakdown gives 409."""
    setup = setup_users_and_children(db_session)
    cg1_headers = make_auth_header(setup["cg1"].clerk_user_id)

    task = Task(child_id=setup["child1"].id, title="Task with steps")
    db_session.add(task)
    db_session.commit()

    step = TaskStep(task_id=task.id, position=1, description="Existing step", estimated_minutes=3)
    db_session.add(step)
    db_session.commit()

    # Attempt breakdown on task with existing steps -> 409 Conflict
    res = client.post(f"/tasks/{task.id}/breakdown", headers=cg1_headers)
    assert res.status_code == 409


def test_7_idempotency_key_support(client: TestClient, db_session: Session):
    """7. Same Idempotency-Key returns stored result without failing."""
    setup = setup_users_and_children(db_session)
    cg1_headers = make_auth_header(setup["cg1"].clerk_user_id)
    headers = {**cg1_headers, "Idempotency-Key": "unique-key-123"}

    task = Task(child_id=setup["child1"].id, title="Clean Room")
    db_session.add(task)
    db_session.commit()

    res1 = client.post(f"/tasks/{task.id}/breakdown", headers=headers)
    assert res1.status_code == 200
    steps_count = len(res1.json())
    assert steps_count >= 3

    # Repeat request with same Idempotency-Key
    res2 = client.post(f"/tasks/{task.id}/breakdown", headers=headers)
    assert res2.status_code == 200
    assert len(res2.json()) == steps_count


def test_8_focus_state_does_not_modify_last_activity_at(client: TestClient, db_session: Session):
    """8. /focus-state does not modify last_activity_at."""
    setup = setup_users_and_children(db_session)
    ch1_headers = make_auth_header(setup["ch1_user"].clerk_user_id)

    fixed_time = datetime(2026, 1, 1, 12, 0, 0)
    task = Task(child_id=setup["child1"].id, title="Read Book", focus_state=FocusState.ACTIVE, last_activity_at=fixed_time)
    db_session.add(task)
    db_session.commit()

    res = client.get(f"/tasks/{task.id}/focus-state", headers=ch1_headers)
    assert res.status_code == 200

    db_session.refresh(task)
    assert task.last_activity_at == fixed_time


def test_9_stuck_adaptation_cap(client: TestClient, db_session: Session):
    """9. /stuck stops making AI calls after configured adaptation cap (3)."""
    setup = setup_users_and_children(db_session)
    ch1_headers = make_auth_header(setup["ch1_user"].clerk_user_id)

    task = Task(child_id=setup["child1"].id, title="Math Homework", current_step_position=1, focus_state=FocusState.ACTIVE)
    db_session.add(task)
    db_session.commit()

    # Step already at adaptation_count = 3
    step = TaskStep(task_id=task.id, position=1, description="Hard Problem", estimated_minutes=4, adaptation_count=3)
    db_session.add(step)
    db_session.commit()

    res = client.post(
        f"/tasks/{task.id}/steps/{step.id}/stuck",
        json={"reason": "TOO_HARD", "expected_step_position": 1},
        headers=ch1_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["outcome"] == "BREAK"
    assert "Adaptation limit reached" in data["message"]


def test_10_telemetry_duplicate_event_id_ignored(client: TestClient, db_session: Session):
    """10. Telemetry duplicate event_id is ignored."""
    setup = setup_users_and_children(db_session)
    ch1_headers = make_auth_header(setup["ch1_user"].clerk_user_id)

    payload = {
        "events": [
            {"event_id": "evt-001", "event_type": "TASK_STARTED"},
            {"event_id": "evt-001", "event_type": "TASK_STARTED"},  # duplicate in batch
        ]
    }

    res = client.post("/telemetry/events", json=payload, headers=ch1_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["recorded"] == 1
    assert data["ignored_duplicates"] == 1


def test_11_and_12_notification_lifecycle_on_task_schedule_and_deletion(client: TestClient, db_session: Session):
    """11. Task schedule changes update/cancel notifications. 12. Task deletion cancels pending notification."""
    setup = setup_users_and_children(db_session)
    cg1_headers = make_auth_header(setup["cg1"].clerk_user_id)

    sched_time = datetime.utcnow() + timedelta(hours=2)
    res = client.post(
        "/tasks",
        json={"child_id": setup["child1"].id, "title": "Scheduled Task", "scheduled_at": sched_time.isoformat()},
        headers=cg1_headers,
    )
    assert res.status_code == 201
    task_id = res.json()["id"]

    # Verify notification created
    notif = db_session.query(Notification).filter_by(task_id=task_id, status=NotificationStatus.PENDING).first()
    assert notif is not None

    # Update schedule -> updates notification
    new_sched = sched_time + timedelta(hours=1)
    client.patch(f"/tasks/{task_id}", json={"scheduled_at": new_sched.isoformat()}, headers=cg1_headers)

    db_session.refresh(notif)
    assert notif.scheduled_at == new_sched

    # Delete task -> cancels notification
    client.delete(f"/tasks/{task_id}", headers=cg1_headers)
    db_session.refresh(notif)
    assert notif.status == NotificationStatus.CANCELLED


def test_13_child_feedback_tied_to_task(client: TestClient, db_session: Session):
    """13. Child feedback is tied to the task."""
    setup = setup_users_and_children(db_session)
    ch1_headers = make_auth_header(setup["ch1_user"].clerk_user_id)

    task = Task(child_id=setup["child1"].id, title="Feedback Task")
    db_session.add(task)
    db_session.commit()

    res = client.post(
        f"/tasks/{task.id}/feedback",
        json={"task_id": task.id, "feeling": "HAPPY", "helped_by": "Timer"},
        headers=ch1_headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["task_id"] == task.id
    assert data["child_id"] == setup["child1"].id


def test_14_and_15_device_registration_and_deletion(client: TestClient, db_session: Session):
    """14. Device registration belongs to user. 15. Cannot remove another user's device."""
    setup = setup_users_and_children(db_session)
    cg1_headers = make_auth_header(setup["cg1"].clerk_user_id)
    cg2_headers = make_auth_header(setup["cg2"].clerk_user_id)

    res = client.post("/devices", json={"expo_push_token": "token-cg1", "platform": "ios"}, headers=cg1_headers)
    assert res.status_code == 201
    device_id = res.json()["id"]

    # CG2 trying to delete CG1's device -> 403
    res_del = client.delete(f"/devices/{device_id}", headers=cg2_headers)
    assert res_del.status_code == 403

    # CG1 deleting own device -> 204
    res_own_del = client.delete(f"/devices/{device_id}", headers=cg1_headers)
    assert res_own_del.status_code == 204
