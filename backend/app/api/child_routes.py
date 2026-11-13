"""
Child routes:
POST /children -> Caregiver only
GET /children -> Caregiver only
GET /children/{child_id} -> Caregiver owning child OR child themselves
PATCH /children/{child_id} -> Caregiver owning child
DELETE /children/{child_id} -> Caregiver owning child
GET /children/{child_id}/export -> Caregiver owning child
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

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
from app.models.user import User
from app.schemas.child import (
    ChildCreate,
    ChildUpdate,
    ChildResponse,
    ChildExportResponse,
)

router = APIRouter(prefix="/children", tags=["Children"])


@router.post("", response_model=ChildResponse, status_code=status.HTTP_201_CREATED)
def create_child(
    data: ChildCreate,
    db: Session = Depends(get_db),
    caregiver: User = Depends(require_caregiver),
) -> ChildResponse:
    """Caregiver creates a new child profile."""
    child = Child(
        caregiver_id=caregiver.id,
        user_id=data.user_id,
        name=data.name,
        age=data.age,
        class_name=data.class_name,
        description=data.description,
    )
    db.add(child)
    db.commit()
    db.refresh(child)
    return ChildResponse.model_validate(child)


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
    return [ChildResponse.model_validate(c) for c in children]


@router.get("/{child_id}", response_model=ChildResponse)
def get_child(
    child_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChildResponse:
    """Get child profile (Caregiver owning child OR child themselves)."""
    child = verify_child_access(db, child_id, current_user)
    return ChildResponse.model_validate(child)


@router.patch("/{child_id}", response_model=ChildResponse)
def update_child(
    child_id: int,
    data: ChildUpdate,
    db: Session = Depends(get_db),
    caregiver: User = Depends(require_caregiver),
) -> ChildResponse:
    """Caregiver updates an owned child profile."""
    child = verify_child_ownership(db, child_id, caregiver)

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
    child = verify_child_ownership(db, child_id, caregiver)

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
    child = verify_child_ownership(db, child_id, caregiver)

    tasks = db.execute(
        select(Task).where(Task.child_id == child_id)
    ).scalars().all()

    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t.status == TaskStatus.COMPLETED])

    feedbacks = db.execute(
        select(Feedback).where(Feedback.child_id == child_id)
    ).scalars().all()

    context = db.execute(
        select(ChildAIContext).where(ChildAIContext.child_id == child_id)
    ).scalar_one_or_none()

    return ChildExportResponse(
        child=ChildResponse.model_validate(child),
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        total_feedback=len(feedbacks),
        preferences=context.preferences if context else None,
    )
