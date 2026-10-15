"""
Child routes:
POST /children: Caregiver creates a child profile and a separate Clerk username/password account.
GET /children -> Caregiver only
GET /children/{child_id} -> Caregiver owning child OR child themselves
PATCH /children/{child_id} -> Caregiver owning child
DELETE /children/{child_id} -> Caregiver owning child
GET /children/{child_id}/export -> Caregiver owning child
"""
from datetime import datetime, timezone
import logging
import re

from clerk_backend_api import Clerk
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    get_current_user,
    require_caregiver,
    verify_child_ownership,
    verify_child_access,
)
from app.models.child import Child
from app.models.task import Task, TaskStatus
from app.models.feedback import Feedback
from app.models.child_ai_context import ChildAIContext
from app.models.user import User, UserRole
from app.schemas.child import (
    ChildCreate,
    ChildUpdate,
    ChildResponse,
    ChildExportResponse,
)

router = APIRouter(prefix="/children", tags=["Children"])
logger = logging.getLogger(__name__)


def _create_clerk_user(username: str, password: str, name: str) -> str:
    """Create a Clerk user and return its Clerk user ID."""
    if not settings.CLERK_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication provider is not configured",
        )

    try:
        with Clerk(bearer_auth=settings.CLERK_SECRET_KEY) as clerk:
            user = clerk.users.create(
                username=username,
                password=password,
                first_name=name,
                public_metadata={"app_role": "CHILD"},
            )
        return user.id
    except Exception as exc:
        error = str(getattr(exc, "message", "") or "")
        if not error:
            error = str(getattr(exc, "body", "") or "")
        if not error:
            error = str(exc)
        if getattr(exc, "status_code", None) == 422:
            logger.warning("Clerk rejected child account input: %s", error[:500])
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Clerk rejected the account details. Check password requirements and username settings.",
            ) from exc

        logger.warning(
            "Clerk user creation failed: %s",
            type(exc).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not create the child authentication account",
        ) from exc

def _delete_clerk_user(clerk_user_id: str) -> None:
    """Best-effort cleanup if local database creation fails."""
    if not settings.CLERK_SECRET_KEY:
        logger.error("Cannot clean up Clerk user: provider is not configured")
        return

    try:
        with Clerk(bearer_auth=settings.CLERK_SECRET_KEY) as clerk:
            clerk.users.delete(user_id=clerk_user_id)
    except Exception as exc:
        # Keep the original database error as the primary failure.
        logger.error(
            "Could not clean up Clerk user after database failure: %s",
            type(exc).__name__,
        )


@router.post("", response_model=ChildResponse, status_code=status.HTTP_201_CREATED)
def create_child(
    data: ChildCreate,
    db: Session = Depends(get_db),
    caregiver: User = Depends(require_caregiver),
) -> ChildResponse:
    """
    Caregiver creates a child profile and a separate Clerk account.
    The password is sent to Clerk and is never stored in our database.
    """
    username = data.username.strip()

    # Clerk usernames should not contain spaces.
    if not re.fullmatch(r"[A-Za-z0-9_-]{4,64}", username):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Username must be 4–64 characters using letters, numbers, underscores, or hyphens.",
        )

    clerk_user_id = _create_clerk_user(
        username=username,
        password=data.password.get_secret_value(),
        name=data.name,
    )

    child_user = User(
        clerk_user_id=clerk_user_id,
        role=UserRole.CHILD,
    )

    try:
        db.add(child_user)
        db.flush()  # Obtain the local User.id before linking the child profile.

        child = Child(
            caregiver_id=caregiver.id,
            user_id=child_user.id,
            name=data.name,
            age=data.age,
            class_name=data.class_name,
            description=data.description,
        )
        db.add(child)
        db.commit()
        db.refresh(child)
        return ChildResponse.model_validate(child)

    
    except Exception as exc:
        logger.warning(
            "Clerk user creation failed: type=%s status=%r message=%s",
            type(exc).__name__,
            getattr(exc, "status_code", None),
            str(getattr(exc, "message", ""))[:500],
        )

        errors = getattr(exc, "errors", None)
        if errors:
            for error in errors[:5]:
                logger.warning(
                    "Clerk error details: code=%r message=%s",
                    getattr(error, "code", None),
                    str(getattr(error, "message", ""))[:300],
                )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not create the child authentication account",
        ) from exc



@router.get("", response_model=list[ChildResponse])
def list_children(
    db: Session = Depends(get_db),
    caregiver: User = Depends(require_caregiver),
) -> list[ChildResponse]:
    """Caregiver lists all their owned children."""
    children = db.execute(
        select(Child).where(
            Child.caregiver_id == caregiver.id,
            Child.is_deleted.is_(False),
        )
    ).scalars().all()
    return [ChildResponse.model_validate(child) for child in children]


@router.get("/{child_id}", response_model=ChildResponse)
def get_child(
    child_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChildResponse:
    """Get child profile (caregiver owning child OR child themselves)."""
    child = verify_child_access(child_id, current_user, db)
    return ChildResponse.model_validate(child)


@router.patch("/{child_id}", response_model=ChildResponse)
def update_child(
    child_id: int,
    data: ChildUpdate,
    db: Session = Depends(get_db),
    caregiver: User = Depends(require_caregiver),
) -> ChildResponse:
    """Caregiver updates an owned child profile."""
    child = verify_child_ownership(child_id, caregiver, db)

    if data.name is not None:
        child.name = data.name
    if data.age is not None:
        child.age = data.age
    if data.class_name is not None:
        child.class_name = data.class_name
    if data.description is not None:
        child.description = data.description

    db.commit()
    db.refresh(child)
    return ChildResponse.model_validate(child)


@router.delete("/{child_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_child(
    child_id: int,
    db: Session = Depends(get_db),
    caregiver: User = Depends(require_caregiver),
) -> None:
    """Caregiver soft-deletes an owned child profile."""
    child = verify_child_ownership(child_id, caregiver, db)
    child.is_deleted = True
    child.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return None


@router.get("/{child_id}/export", response_model=ChildExportResponse)
def export_child_data(
    child_id: int,
    db: Session = Depends(get_db),
    caregiver: User = Depends(require_caregiver),
) -> ChildExportResponse:
    """Caregiver exports all data for an owned child."""
    child = verify_child_ownership(child_id, caregiver, db)

    tasks = db.execute(
        select(Task).where(Task.child_id == child_id)
    ).scalars().all()
    completed_tasks = sum(
        1 for task in tasks if task.status == TaskStatus.COMPLETED
    )

    feedbacks = db.execute(
        select(Feedback).where(Feedback.child_id == child_id)
    ).scalars().all()
    context = db.execute(
        select(ChildAIContext).where(ChildAIContext.child_id == child_id)
    ).scalar_one_or_none()

    return ChildExportResponse(
        child=ChildResponse.model_validate(child),
        total_tasks=len(tasks),
        completed_tasks=completed_tasks,
        total_feedback=len(feedbacks),
        preferences=context.preferences if context else None,
    )
