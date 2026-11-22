import base64
import json
import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker, Session
from fastapi import HTTPException, Request
from fastapi.testclient import TestClient

from app.core.database import Base, get_db
from app.core.security import get_current_user
from app.main import app
from app.models.user import User, UserRole
from app.models.child import Child
from app.models.task import Task, TaskStatus, FocusState
from app.models.task_step import TaskStep, TaskStepStatus

# Use in-memory SQLite for tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def create_db_tables():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session() -> Session:
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


class DeterministicAIProvider:
    """Offline AI provider for tests: no Ollama/OpenAI network calls."""

    def generate_json(self, system_prompt: str, user_prompt: str) -> dict:
        if "Simplify and clarify this single step" in system_prompt:
            return {
                "description": "Try one small, clear part of the step",
                "estimated_minutes": 2,
            }
        if "Split this step into 2" in system_prompt:
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


@pytest.fixture(autouse=True)
def mock_ai_provider(monkeypatch):
    """Replace LLM-backed generation and guardrails with offline stubs."""
    import app.services.ai_service as ai_service
    from app.guardrails.guardrails_service import GuardrailsService

    monkeypatch.setattr(
        ai_service, "get_ai_provider", lambda: DeterministicAIProvider()
    )
    # NeMo Guardrails also calls an LLM; stub it so tests never need a model.
    monkeypatch.setattr(GuardrailsService, "check_input", staticmethod(lambda text: None))
    monkeypatch.setattr(GuardrailsService, "check_output", staticmethod(lambda text: None))


@pytest.fixture
def client(db_session: Session) -> TestClient:
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    def _fake_get_current_user(request: Request) -> User:
        """Resolve the fake bearer token to a local application user."""
        auth = request.headers.get("authorization", "")
        if not auth.lower().startswith("bearer "):
            raise HTTPException(status_code=401, detail="Missing bearer token")

        token = auth.split(" ", 1)[1]
        try:
            payload_b64 = token.split(".")[1]
            payload_b64 += "=" * (-len(payload_b64) % 4)
            payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        except Exception as exc:
            raise HTTPException(status_code=401, detail="Invalid token") from exc

        clerk_id = payload.get("sub")
        user = db_session.execute(
            select(User).where(User.clerk_user_id == clerk_id)
        ).scalar_one_or_none()

        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user] = _fake_get_current_user
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def make_auth_header(clerk_id: str) -> dict[str, str]:
    """Helper to build fake Bearer token header."""
    header = base64.b64encode(json.dumps({"alg": "none"}).encode()).decode()
    payload = base64.b64encode(json.dumps({"sub": clerk_id}).encode()).decode()
    token = f"{header}.{payload}.sig"
    return {"Authorization": f"Bearer {token}"}
