"""
Test suite for Task management, Microsteps, and Task Deque Algorithm.
Covers task creation (standard & legacy frontend contracts), updates, deletion with
cascading notification cancellation, role-based visibility, and TaskStepDeque operations.
"""

from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.algorithms.task_deque import TaskStepDeque
from app.models.child import Child
from app.models.notification import Notification, NotificationStatus
from app.models.task import Task, TaskStatus, FocusState
from app.models.task_step import TaskStep, TaskStepStatus
from app.models.user import User
from tests.conftest import make_auth_header


# ---------------------------------------------------------------------------
# Task CRUD & Legacy Payload Tests
# ---------------------------------------------------------------------------

def test_create_task_standard(client: TestClient, caregiver: User, child: Child):
    """Caregiver creates a task with standard fields."""
    headers = make_auth_header(caregiver.clerk_user_id)
    payload = {
        "child_id": child.id,
        "title": "Clean Bedroom",
        "description": "Put clothes into closet and make the bed",
        "priority": 2,
    }
    response = client.post("/tasks", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Clean Bedroom"
    assert data["description"] == "Put clothes into closet and make the bed"
    assert data["child_id"] == child.id
    assert data["status"] == "PENDING"
    assert data["priority"] == 2


def test_create_task_legacy_frontend_contract(client: TestClient, caregiver: User, child: Child):
    """
    Task creation accepts legacy frontend payload:
    - scheduled_time (alias for scheduled_at)
    - string priority ('NORMAL', 'HIGH', etc.)
    - estimated_minutes, recurrence, reward_points
    """
    headers = make_auth_header(caregiver.clerk_user_id)
    payload = {
        "child_id": child.id,
        "title": "Science Project",
        "scheduled_time": "2026-11-25T14:00:00",
        "priority": "HIGH",
        "estimated_minutes": 30,
        "recurrence": "Weekly",
        "reward_points": 50,
    }
    response = client.post("/tasks", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Science Project"
    assert data["priority"] == 3  # HIGH maps to 3
    assert data["scheduled_at"] is not None
    assert data["estimated_minutes"] == 30
    assert data["recurrence"] == "Weekly"
    assert data["reward_points"] == 50


def test_list_tasks_caregiver_and_child(
    client: TestClient, caregiver: User, child_user: User, child: Child, child2: Child, db: Session
):
    """
    Caregiver sees tasks for their children (with optional child_id filter).
    Child sees only their own assigned tasks.
    """
    task1 = Task(child_id=child.id, title="Child 1 Task")
    task2 = Task(child_id=child2.id, title="Child 2 Task")
    db.add_all([task1, task2])
    db.commit()

    # Caregiver 1 sees Child 1 tasks
    cg1_headers = make_auth_header(caregiver.clerk_user_id)
    res_cg = client.get("/tasks", headers=cg1_headers)
    assert res_cg.status_code == 200
    cg_titles = [t["title"] for t in res_cg.json()]
    assert "Child 1 Task" in cg_titles
    assert "Child 2 Task" not in cg_titles

    # Child 1 sees only their tasks
    ch1_headers = make_auth_header(child_user.clerk_user_id)
    res_ch = client.get("/tasks", headers=ch1_headers)
    assert res_ch.status_code == 200
    ch_titles = [t["title"] for t in res_ch.json()]
    assert "Child 1 Task" in ch_titles
    assert "Child 2 Task" not in ch_titles


def test_get_task_and_steps(
    client: TestClient, caregiver: User, child: Child, db: Session
):
    """Retrieve task details and associated steps."""
    task = Task(child_id=child.id, title="Task with steps")
    db.add(task)
    db.commit()

    step1 = TaskStep(task_id=task.id, position=1, description="Step 1", estimated_minutes=5)
    step2 = TaskStep(task_id=task.id, position=2, description="Step 2", estimated_minutes=5)
    db.add_all([step1, step2])
    db.commit()

    headers = make_auth_header(caregiver.clerk_user_id)

    # Get task
    res_task = client.get(f"/tasks/{task.id}", headers=headers)
    assert res_task.status_code == 200
    assert res_task.json()["id"] == task.id

    # Get task steps
    res_steps = client.get(f"/tasks/{task.id}/steps", headers=headers)
    assert res_steps.status_code == 200
    steps = res_steps.json()
    assert len(steps) == 2
    assert steps[0]["description"] == "Step 1"
    assert steps[1]["description"] == "Step 2"


def test_update_task_details_and_legacy_alias(
    client: TestClient, caregiver: User, child: Child, db: Session
):
    """Caregiver updates task, including scheduled_time alias and priority string."""
    task = Task(child_id=child.id, title="Original Title", priority=1)
    db.add(task)
    db.commit()

    headers = make_auth_header(caregiver.clerk_user_id)
    patch_payload = {
        "title": "Updated Title",
        "priority": "HIGH",
        "scheduled_time": "2026-11-26T10:00:00",
    }
    response = client.patch(f"/tasks/{task.id}", json=patch_payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Title"
    assert data["priority"] == 3
    assert data["scheduled_at"] is not None


def test_delete_task_cancels_pending_notification(
    client: TestClient, caregiver: User, child: Child, db: Session
):
    """Deleting a task deletes the task and marks associated pending notifications as CANCELLED."""
    headers = make_auth_header(caregiver.clerk_user_id)
    future_time = datetime.now(timezone.utc) + timedelta(hours=3)

    # Create task with schedule
    res_create = client.post(
        "/tasks",
        json={
            "child_id": child.id,
            "title": "Task To Delete",
            "scheduled_at": future_time.isoformat(),
        },
        headers=headers,
    )
    assert res_create.status_code == 201
    task_id = res_create.json()["id"]

    # Verify notification exists
    notif = db.query(Notification).filter_by(task_id=task_id, status=NotificationStatus.PENDING).first()
    assert notif is not None

    # Delete task
    res_del = client.delete(f"/tasks/{task_id}", headers=headers)
    assert res_del.status_code == 204

    # Notification must now be cancelled
    db.refresh(notif)
    assert notif.status == NotificationStatus.CANCELLED


def test_task_cross_user_isolation(
    client: TestClient, caregiver2: User, child: Child, db: Session
):
    """Unrelated caregiver cannot access or update another child's task (returns 404)."""
    task = Task(child_id=child.id, title="Isolated Task")
    db.add(task)
    db.commit()

    cg2_headers = make_auth_header(caregiver2.clerk_user_id)

    # Get
    assert client.get(f"/tasks/{task.id}", headers=cg2_headers).status_code == 404

    # Patch
    assert client.patch(f"/tasks/{task.id}", json={"title": "Hacked"}, headers=cg2_headers).status_code == 404

    # Delete
    assert client.delete(f"/tasks/{task.id}", headers=cg2_headers).status_code == 404


# ---------------------------------------------------------------------------
# TaskStepDeque Algorithm Unit Tests
# ---------------------------------------------------------------------------

def test_task_step_deque_operations():
    """Unit test verifying the TaskStepDeque in-memory execution queue."""
    deque = TaskStepDeque(["Step A", "Step B", "Step C"])

    assert len(deque) == 3
    assert not deque.is_empty()
    assert deque.peek_current() == "Step A"
    assert deque.peek_next() == "Step B"

    # Advance (complete Step A)
    next_step = deque.advance()
    assert next_step == "Step B"
    assert deque.peek_current() == "Step B"
    assert len(deque) == 2

    # Replace current (refinement)
    deque.replace_current("Step B Refined")
    assert deque.peek_current() == "Step B Refined"
    assert deque.to_list() == ["Step B Refined", "Step C"]

    # Decompose current (break Step B Refined into B1, B2)
    deque.decompose_current(["Step B1", "Step B2"])
    assert deque.to_list() == ["Step B1", "Step B2", "Step C"]
    assert deque.peek_current() == "Step B1"
    assert deque.peek_next() == "Step B2"

    # Advance until empty
    assert deque.advance() == "Step B2"
    assert deque.advance() == "Step C"
    assert deque.advance() is None
    assert deque.is_empty()
    assert deque.peek_current() is None
    assert deque.peek_next() is None


def test_task_step_deque_error_handling():
    """TaskStepDeque raises appropriate errors on invalid empty operations."""
    empty_deque = TaskStepDeque[str]()

    with pytest.raises(IndexError, match="Cannot refine an empty"):
        empty_deque.replace_current("Fail")

    with pytest.raises(IndexError, match="Cannot decompose an empty"):
        empty_deque.decompose_current(["Fail"])

    non_empty = TaskStepDeque(["A"])
    with pytest.raises(ValueError, match="must contain at least one step"):
        non_empty.decompose_current([])
