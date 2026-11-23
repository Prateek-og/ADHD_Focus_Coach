"""
Test suite for Authentication, Core endpoints, and Security authorization.
Covers root health check, onboarding, user identity, role permissions, and token validation.
"""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from tests.conftest import make_auth_header


def test_root_health_check(client: TestClient):
    """Verify application root endpoint is online and responsive."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "ADHD Focus Coach API is running"}


def test_unauthenticated_request_returns_401(client: TestClient):
    """Missing Authorization header must return HTTP 401."""
    response = client.get("/auth/me")
    assert response.status_code == 401
    assert "detail" in response.json()


def test_invalid_bearer_token_returns_401(client: TestClient):
    """Malformed or invalid Bearer token must return HTTP 401."""
    response = client.get("/auth/me", headers={"Authorization": "Bearer invalid_token"})
    assert response.status_code == 401


def test_onboard_caregiver_and_child(client: TestClient, db: Session):
    """POST /auth/onboard successfully registers Caregiver and Child users."""
    cg_headers = make_auth_header("clerk_new_cg_123")
    res_cg = client.post(
        "/auth/onboard",
        json={"role": "CAREGIVER"},
        headers=cg_headers,
    )
    assert res_cg.status_code == 200
    cg_data = res_cg.json()
    assert cg_data["clerk_user_id"] == "clerk_new_cg_123"
    assert cg_data["role"] == "CAREGIVER"

    ch_headers = make_auth_header("clerk_new_ch_456")
    res_ch = client.post(
        "/auth/onboard",
        json={"role": "CHILD"},
        headers=ch_headers,
    )
    assert res_ch.status_code == 200
    ch_data = res_ch.json()
    assert ch_data["clerk_user_id"] == "clerk_new_ch_456"
    assert ch_data["role"] == "CHILD"


def test_onboard_idempotent_same_role(client: TestClient, caregiver: User):
    """Repeating /auth/onboard with same role succeeds and returns existing user."""
    headers = make_auth_header(caregiver.clerk_user_id)
    response = client.post(
        "/auth/onboard",
        json={"role": "CAREGIVER"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["id"] == caregiver.id


def test_onboard_role_change_conflict_returns_409(client: TestClient, caregiver: User):
    """Attempting to change an assigned role via /auth/onboard returns 409 Conflict."""
    headers = make_auth_header(caregiver.clerk_user_id)
    response = client.post(
        "/auth/onboard",
        json={"role": "CHILD"},
        headers=headers,
    )
    assert response.status_code == 409
    assert "role" in response.json()["detail"].lower()


def test_get_me_endpoint(client: TestClient, caregiver: User, child_user: User):
    """GET /auth/me returns the identity and role of the authenticated caller."""
    res_cg = client.get("/auth/me", headers=make_auth_header(caregiver.clerk_user_id))
    assert res_cg.status_code == 200
    cg_info = res_cg.json()
    assert cg_info["id"] == caregiver.id
    assert cg_info["clerk_user_id"] == caregiver.clerk_user_id
    assert "CAREGIVER" in cg_info["role"]

    res_ch = client.get("/auth/me", headers=make_auth_header(child_user.clerk_user_id))
    assert res_ch.status_code == 200
    ch_info = res_ch.json()
    assert ch_info["id"] == child_user.id
    assert ch_info["clerk_user_id"] == child_user.clerk_user_id
    assert "CHILD" in ch_info["role"]


def test_unonboarded_clerk_identity_returns_403(client: TestClient):
    """Clerk JWT for a user not yet onboarded in DB returns 403 Forbidden on protected routes."""
    headers = make_auth_header("clerk_not_onboarded_user")
    response = client.get("/auth/me", headers=headers)
    assert response.status_code == 403
    assert "onboarding" in response.json()["detail"].lower()


def test_role_enforcement_child_forbidden_from_caregiver_endpoint(
    client: TestClient, child_user: User
):
    """Child role calling caregiver-restricted endpoint receives 403 Forbidden."""
    headers = make_auth_header(child_user.clerk_user_id)
    # GET /children is caregiver-only
    response = client.get("/children", headers=headers)
    assert response.status_code == 403
    assert "caregiver" in response.json()["detail"].lower()
