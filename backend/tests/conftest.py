"""
Shared test configuration and fixtures for ADHD Focus Coach backend.
Provides offline, deterministic in-memory database, authentication,
Redis, AI provider, and guardrails mocks.
"""

from __future__ import annotations

import base64
import json
import uuid
from typing import Generator
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app
from app.models.child import Child
from app.models.user import User, UserRole


# ---------------------------------------------------------------------------
# In-memory Database setup
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def engine():
    """Create a single shared in-memory SQLite engine for the test session."""
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    return test_engine


@pytest.fixture
def db(engine) -> Generator[Session, None, None]:
    """Provide a fresh, clean database session with all tables recreated per test."""
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session(db: Session) -> Session:
    """Alias for db fixture for backward compatibility."""
    return db


# ---------------------------------------------------------------------------
# Auth helper and Clerk Token Mock
# ---------------------------------------------------------------------------

def make_auth_header(clerk_id: str) -> dict[str, str]:
    """Helper to build a test Bearer token containing the target clerk_id."""
    header = base64.b64encode(json.dumps({"alg": "none", "typ": "JWT"}).encode()).decode()
    payload = base64.b64encode(
        json.dumps({
            "sub": clerk_id,
            "iss": "https://clerk.test",
            "exp": 9999999999,
        }).encode()
    ).decode()
    token = f"{header}.{payload}.signature"
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def mock_clerk_auth(monkeypatch):
    """
    Mock Clerk token verification so test Bearer tokens decode deterministically
    without network calls, while still exercising all FastAPI dependency chains.
    """
    def _fake_decode_clerk_token(token: str) -> dict:
        if not token or token == "invalid_token":
            raise HTTPException(status_code=401, detail="Invalid token")
        try:
            parts = token.split(".")
            if len(parts) >= 2:
                payload_b64 = parts[1]
                payload_b64 += "=" * (-len(payload_b64) % 4)
                payload = json.loads(base64.urlsafe_b64decode(payload_b64))
                if not isinstance(payload.get("sub"), str) or not payload["sub"]:
                    raise HTTPException(status_code=401, detail="Token has no valid subject")
                return payload
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=401, detail="Invalid token") from exc
        raise HTTPException(status_code=401, detail="Invalid token format")

    monkeypatch.setattr("app.core.security._decode_clerk_token", _fake_decode_clerk_token)

    # Stub Clerk child user creation/deletion so network isn't called
    monkeypatch.setattr(
        "app.api.child_routes._create_clerk_user",
        lambda username, password, name: f"clerk_created_{uuid.uuid4().hex[:10]}",
    )
    monkeypatch.setattr("app.api.child_routes._delete_clerk_user", lambda clerk_user_id: None)


# ---------------------------------------------------------------------------
# In-memory Fake Redis Mock
# ---------------------------------------------------------------------------

class FakeRedis:
    """In-memory Redis mock supporting get, set, exists, ping, and rate limit eval."""

    def __init__(self):
        self.data: dict[str, str] = {}

    def ping(self) -> bool:
        return True

    def get(self, key: str) -> str | None:
        return self.data.get(key)

    def set(self, key: str, value: str, ex: int | None = None, nx: bool = False) -> bool | None:
        if nx and key in self.data:
            return None
        self.data[key] = str(value)
        return True

    def exists(self, key: str) -> int:
        return 1 if key in self.data else 0

    def delete(self, *keys: str) -> int:
        count = 0
        for k in keys:
            if k in self.data:
                del self.data[k]
                count += 1
        return count

    def eval(self, script: str, numkeys: int, key: str, *args) -> int:
        current = int(self.data.get(key, 0)) + 1
        self.data[key] = str(current)
        return current


@pytest.fixture(autouse=True)
def mock_redis_and_queues(monkeypatch):
    """Provide fast, isolated in-memory Redis and stub worker queue dispatching."""
    fake_redis = FakeRedis()
    import app.core.redis as redis_mod
    monkeypatch.setattr(redis_mod, "_redis_client", fake_redis)
    monkeypatch.setattr(redis_mod, "get_redis", lambda: fake_redis)

    # Workers / RQ stub
    monkeypatch.setattr("app.workers.queue.schedule_notification", lambda *args, **kwargs: None)
    monkeypatch.setattr("app.workers.queue.cancel_notification_job", lambda *args, **kwargs: None)
    monkeypatch.setattr("app.services.notification_service.schedule_notification", lambda *args, **kwargs: None)
    monkeypatch.setattr("app.services.notification_service.cancel_notification_job", lambda *args, **kwargs: None)


# ---------------------------------------------------------------------------
# AI Provider and Guardrails Mock
# ---------------------------------------------------------------------------

class DeterministicAIProvider:
    """Offline, deterministic AI provider for tests: no Ollama/OpenAI network calls."""

    def generate_json(self, system_prompt: str, user_prompt: str) -> dict:
        if "Simplify and clarify" in system_prompt or "refin" in system_prompt.lower():
            return {
                "description": "Try one small, clear part of the step",
                "estimated_minutes": 2,
            }
        if "Split this step into 2" in system_prompt or "decompos" in system_prompt.lower():
            return {
                "steps": [
                    {"description": "Do the first small part", "estimated_minutes": 2},
                    {"description": "Do the second small part", "estimated_minutes": 2},
                ]
            }
        return {
            "steps": [
                {"description": "Gather what you need for the task", "estimated_minutes": 2},
                {"description": "Do the first part of the task", "estimated_minutes": 3},
                {"description": "Check your work and finish up", "estimated_minutes": 2},
            ]
        }


class FakeRailResult:
    def __init__(self, status):
        self.status = status


class FakeGuardrails:
    def __init__(self, blocked: bool = False):
        self.blocked = blocked

    def check(self, messages, rail_types):
        from nemoguardrails.rails.llm.options import RailStatus
        status = RailStatus.BLOCKED if self.blocked else (
            RailStatus.ALLOWED if hasattr(RailStatus, "ALLOWED") else "allowed"
        )
        return FakeRailResult(status)


@pytest.fixture(autouse=True)
def mock_ai_and_guardrails(monkeypatch):
    """Replace external LLM and NeMo Guardrails calls with offline deterministic stubs."""
    import app.services.ai_service as ai_service
    import app.guardrails.guardrails_service as guardrails_mod

    monkeypatch.setattr(ai_service, "get_ai_provider", lambda: DeterministicAIProvider())
    monkeypatch.setattr(guardrails_mod, "get_guardrails", lambda: FakeGuardrails(blocked=False))


# ---------------------------------------------------------------------------
# FastAPI TestClient
# ---------------------------------------------------------------------------

@pytest.fixture
def client(db: Session) -> Generator[TestClient, None, None]:
    """TestClient wired to the test SQLite database session."""
    def _override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Standard Domain Entities (Caregivers & Children)
# ---------------------------------------------------------------------------

@pytest.fixture
def caregiver(db: Session) -> User:
    """Primary caregiver user."""
    user = User(clerk_user_id="clerk_cg_primary", role=UserRole.CAREGIVER)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def caregiver2(db: Session) -> User:
    """Secondary caregiver user for isolation / ownership verification."""
    user = User(clerk_user_id="clerk_cg_secondary", role=UserRole.CAREGIVER)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def child_user(db: Session) -> User:
    """Primary child user account."""
    user = User(clerk_user_id="clerk_ch_primary", role=UserRole.CHILD)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def child_user2(db: Session) -> User:
    """Secondary child user account."""
    user = User(clerk_user_id="clerk_ch_secondary", role=UserRole.CHILD)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def child(db: Session, caregiver: User, child_user: User) -> Child:
    """Primary child profile linked to caregiver and child_user."""
    child_record = Child(
        caregiver_id=caregiver.id,
        user_id=child_user.id,
        name="Alex Doe",
        age=9,
        class_name="4th Grade",
    )
    db.add(child_record)
    db.commit()
    db.refresh(child_record)
    return child_record


@pytest.fixture
def child2(db: Session, caregiver2: User, child_user2: User) -> Child:
    """Secondary child profile linked to caregiver2 and child_user2."""
    child_record = Child(
        caregiver_id=caregiver2.id,
        user_id=child_user2.id,
        name="Sam Smith",
        age=11,
        class_name="6th Grade",
    )
    db.add(child_record)
    db.commit()
    db.refresh(child_record)
    return child_record
