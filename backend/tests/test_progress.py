"""
Test suite for Streak Calculation, Precomputed Progress, Summaries, and Multi-Child Routing.
Covers sliding-window streak calculation algorithm, progress summary endpoints,
and role/ownership enforcement for progress data.
"""

from datetime import date, datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.algorithms.streak import calculate_streak
from app.models.child import Child
from app.models.task import FocusState, Task, TaskStatus
from app.models.task_step import TaskStep, TaskStepStatus
from app.models.user import User
from tests.conftest import make_auth_header


# ---------------------------------------------------------------------------
# Streak Algorithm Unit Tests
# ---------------------------------------------------------------------------

def test_streak_calculation_empty_and_single_day():
    """Empty completions produce (0,0); single completions today or yesterday produce (1,1)."""
    today = date(2026, 11, 23)

    # Empty
    assert calculate_streak([], today=today) == (0, 0)

    # Completion today -> active streak 1
    assert calculate_streak([today], today=today) == (1, 1)

    # Completion yesterday -> active streak 1
    yesterday = today - timedelta(days=1)
    assert calculate_streak([yesterday], today=today) == (1, 1)

    # Completion 2 days ago -> streak broken (current=0, longest=1)
    two_days_ago = today - timedelta(days=2)
    assert calculate_streak([two_days_ago], today=today) == (0, 1)


def test_streak_consecutive_days_and_gaps():
    """Consecutive active days accumulate streak; gaps reset current while retaining longest."""
    today = date(2026, 11, 23)

    # 4 consecutive days ending today -> (4, 4)
    days_4 = [today - timedelta(days=i) for i in range(3, -1, -1)]
    assert calculate_streak(days_4, today=today) == (4, 4)

    # 4 consecutive days ending yesterday -> (4, 4)
    days_4_yesterday = [today - timedelta(days=i) for i in range(4, 0, -1)]
    assert calculate_streak(days_4_yesterday, today=today) == (4, 4)

    # Multiple completions on the same date count as one active day
    multiple_same_day = [today, today, today - timedelta(days=1)]
    assert calculate_streak(multiple_same_day, today=today) == (2, 2)

    # Historical streak of 5 days, followed by a gap, then 2 days active ending today
    past_streak = [today - timedelta(days=i) for i in range(20, 15, -1)]  # 5 days
    current_part = [today - timedelta(days=1), today]  # 2 days
    assert calculate_streak(past_streak + current_part, today=today) == (2, 5)


# ---------------------------------------------------------------------------
# Progress API Endpoints Tests
# ---------------------------------------------------------------------------

def test_progress_summary_and_streak_endpoints(
    client: TestClient, caregiver: User, child: Child, db: Session
):
    """Caregiver retrieves progress summary, streak, and full progress records."""
    headers = make_auth_header(caregiver.clerk_user_id)
    now = datetime.now(timezone.utc)

    # Create completed task with completed step
    task = Task(
        child_id=child.id,
        title="Completed Math Homework",
        status=TaskStatus.COMPLETED,
        focus_state=FocusState.COMPLETED,
        last_activity_at=now,
    )
    db.add(task)
    db.commit()

    step = TaskStep(
        task_id=task.id,
        position=1,
        description="Problems 1-10",
        estimated_minutes=3,
        status=TaskStepStatus.COMPLETED,
    )
    db.add(step)
    db.commit()

    # GET /progress/summary
    res_summary = client.get("/progress/summary", headers=headers)
    assert res_summary.status_code == 200
    summary = res_summary.json()
    assert summary["tasks_total"] == 1
    assert summary["tasks_completed"] == 1
    assert summary["steps_completed"] == 1
    assert summary["completion_rate"] == 1.0

    # GET /progress/streak
    res_streak = client.get("/progress/streak", headers=headers)
    assert res_streak.status_code == 200
    streak_data = res_streak.json()
    assert streak_data["current_streak"] >= 1
    assert streak_data["longest_streak"] >= 1

    # GET /progress
    res_full = client.get("/progress", headers=headers)
    assert res_full.status_code == 200
    full_data = res_full.json()
    assert full_data["tasks_completed"] == 1


def test_progress_multi_child_requires_child_id_for_caregiver(
    client: TestClient, caregiver: User, child: Child, child_user2: User, db: Session
):
    """When a caregiver manages multiple children, /progress requires an explicit child_id parameter."""
    # Add second child under the same caregiver
    child_two = Child(
        caregiver_id=caregiver.id,
        user_id=child_user2.id,
        name="Second Child",
        age=12,
        class_name="7th Grade",
    )
    db.add(child_two)
    db.commit()

    headers = make_auth_header(caregiver.clerk_user_id)

    # Omission of child_id when multiple children exist returns 400 Bad Request
    res_missing = client.get("/progress/summary", headers=headers)
    assert res_missing.status_code == 400
    assert "child_id is required" in res_missing.json()["detail"].lower()

    # Passing explicit child_id succeeds
    res_explicit = client.get(f"/progress/summary?child_id={child.id}", headers=headers)
    assert res_explicit.status_code == 200


def test_child_queries_own_progress_automatically(
    client: TestClient, child_user: User, child: Child, db: Session
):
    """Child user querying progress automatically resolves to their own profile."""
    headers = make_auth_header(child_user.clerk_user_id)
    response = client.get("/progress/summary", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "tasks_total" in data


def test_progress_cross_caregiver_forbidden(
    client: TestClient, caregiver2: User, child: Child, child2: Child
):
    """Caregiver cannot query progress for another caregiver's child (403 Forbidden)."""
    headers = make_auth_header(caregiver2.clerk_user_id)
    response = client.get(f"/progress/summary?child_id={child.id}", headers=headers)
    assert response.status_code == 403
