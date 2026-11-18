import base64
import json
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from fastapi.testclient import TestClient

from app.core.database import Base, get_db
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


@pytest.fixture
def client(db_session: Session) -> TestClient:
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def make_auth_header(clerk_id: str) -> dict[str, str]:
    """Helper to build fake Bearer token header."""
    header = base64.b64encode(json.dumps({"alg": "none"}).encode()).decode()
    payload = base64.b64encode(json.dumps({"sub": clerk_id}).encode()).decode()
    token = f"{header}.{payload}.sig"
    return {"Authorization": f"Bearer {token}"}
