"""
Test suite for Child profile management and caregiver-child relationships.
Covers child creation, Clerk account provisioning, retrieval, updates,
deletion, cross-caregiver isolation, and data export.
"""

import uuid
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.child import Child
from app.models.task import Task, TaskStatus, FocusState
from app.models.user import User
from tests.conftest import make_auth_header


def test_create_child_success(client: TestClient, caregiver: User):
    """Caregiver creates a child profile with Clerk authentication credentials."""
    headers = make_auth_header(caregiver.clerk_user_id)
    username = f"child_{uuid.uuid4().hex[:8]}"
    payload = {
        "name": "Tommy Lee",
        "age": 8,
        "class_name": "3rd Grade",
        "username": username,
        "password": "StrongPassword!12345",
    }

    response = client.post("/children", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Tommy Lee"
    assert data["age"] == 8
    assert data["class_name"] == "3rd Grade"
    assert data["caregiver_id"] == caregiver.id
    assert data["user_id"] is not None


def test_create_child_forbidden_for_child_role(client: TestClient, child_user: User):
    """Child user cannot create other child profiles (403 Forbidden)."""
    headers = make_auth_header(child_user.clerk_user_id)
    payload = {
        "name": "Forbidden Child",
        "age": 7,
        "class_name": "2nd Grade",
        "username": f"forbid_{uuid.uuid4().hex[:8]}",
        "password": "StrongPassword!12345",
    }
    response = client.post("/children", json=payload, headers=headers)
    assert response.status_code == 403


def test_create_child_clerk_rejected_input(client: TestClient, caregiver: User, monkeypatch):
    """When Clerk rejects credentials (HTTP 422), the endpoint returns 422."""
    headers = make_auth_header(caregiver.clerk_user_id)

    def fail_clerk(*args, **kwargs):
        raise HTTPException(
            status_code=422,
            detail="Clerk rejected the account details. Check password requirements and username settings.",
        )

    monkeypatch.setattr("app.api.child_routes._create_clerk_user", fail_clerk)

    payload = {
        "name": "Weak Pass Child",
        "age": 9,
        "class_name": "4th Grade",
        "username": "weakchild",
        "password": "StrongPassword!12345",
    }
    response = client.post("/children", json=payload, headers=headers)
    assert response.status_code == 422
    assert "clerk rejected" in response.json()["detail"].lower()


def test_create_child_clerk_service_failure(client: TestClient, caregiver: User, monkeypatch):
    """When Clerk is unavailable or errors (non-422), the endpoint returns 502."""
    headers = make_auth_header(caregiver.clerk_user_id)

    def fail_clerk(*args, **kwargs):
        raise HTTPException(
            status_code=502,
            detail="Could not create the child authentication account",
        )

    monkeypatch.setattr("app.api.child_routes._create_clerk_user", fail_clerk)

    payload = {
        "name": "Error Child",
        "age": 10,
        "class_name": "5th Grade",
        "username": "errchild",
        "password": "StrongPassword!12345",
    }
    response = client.post("/children", json=payload, headers=headers)
    assert response.status_code == 502
    assert "could not create" in response.json()["detail"].lower()


def test_list_children_isolation(client: TestClient, caregiver: User, caregiver2: User, child: Child, child2: Child):
    """Caregiver lists only children that belong to them."""
    cg1_headers = make_auth_header(caregiver.clerk_user_id)
    cg2_headers = make_auth_header(caregiver2.clerk_user_id)

    res1 = client.get("/children", headers=cg1_headers)
    assert res1.status_code == 200
    ids1 = [c["id"] for c in res1.json()]
    assert child.id in ids1
    assert child2.id not in ids1

    res2 = client.get("/children", headers=cg2_headers)
    assert res2.status_code == 200
    ids2 = [c["id"] for c in res2.json()]
    assert child2.id in ids2
    assert child.id not in ids2


def test_get_child_by_caregiver_and_by_child(
    client: TestClient, caregiver: User, child_user: User, child: Child
):
    """Both the owning caregiver and the child user itself can retrieve the child profile."""
    # Owning caregiver
    res_cg = client.get(f"/children/{child.id}", headers=make_auth_header(caregiver.clerk_user_id))
    assert res_cg.status_code == 200
    assert res_cg.json()["id"] == child.id

    # The child themselves
    res_ch = client.get(f"/children/{child.id}", headers=make_auth_header(child_user.clerk_user_id))
    assert res_ch.status_code == 200
    assert res_ch.json()["id"] == child.id


def test_update_child_profile(client: TestClient, caregiver: User, child: Child):
    """Caregiver updates child age, grade/class, and name."""
    headers = make_auth_header(caregiver.clerk_user_id)
    payload = {"name": "Alex Updated", "age": 10, "class_name": "5th Grade"}

    response = client.patch(f"/children/{child.id}", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Alex Updated"
    assert data["age"] == 10
    assert data["class_name"] == "5th Grade"


def test_delete_child_profile(client: TestClient, caregiver: User, child: Child, db: Session):
    """Caregiver successfully deletes child profile."""
    headers = make_auth_header(caregiver.clerk_user_id)
    response = client.delete(f"/children/{child.id}", headers=headers)
    assert response.status_code == 204

    # Verify no longer accessible
    get_res = client.get(f"/children/{child.id}", headers=headers)
    assert get_res.status_code == 404


def test_child_ownership_protection_returns_404(
    client: TestClient, caregiver2: User, child: Child
):
    """Unrelated caregiver cannot access, update, or delete another caregiver's child."""
    headers = make_auth_header(caregiver2.clerk_user_id)

    # Get
    assert client.get(f"/children/{child.id}", headers=headers).status_code == 404

    # Patch
    assert client.patch(f"/children/{child.id}", json={"age": 12}, headers=headers).status_code == 404

    # Delete
    assert client.delete(f"/children/{child.id}", headers=headers).status_code == 404


def test_export_child_data(client: TestClient, caregiver: User, child: Child, db: Session):
    """GET /children/{child_id}/export returns structured export of child profile and tasks."""
    task = Task(
        child_id=child.id,
        title="Math Worksheet",
        status=TaskStatus.COMPLETED,
        focus_state=FocusState.COMPLETED,
    )
    db.add(task)
    db.commit()

    headers = make_auth_header(caregiver.clerk_user_id)
    response = client.get(f"/children/{child.id}/export", headers=headers)
    assert response.status_code == 200
    export_data = response.json()
    assert export_data["child"]["id"] == child.id
    assert export_data["child"]["name"] == child.name
    assert export_data["total_tasks"] == 1
    assert export_data["completed_tasks"] == 1
