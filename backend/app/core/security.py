"""
Authentication and authorization helpers for the FastAPI backend.

This module keeps authentication and resource-access checks in one place.
Route/service imports are intentionally kept compatible with the existing
backend, so this rewrite does not require changes to other files.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.child import Child
from app.models.task import Task
from app.models.user import User, UserRole


# ---------------------------------------------------------------------------
# Token handling
# ---------------------------------------------------------------------------


def _decode_clerk_token(token: str) -> dict:
    """
    Decode the Clerk JWT payload and perform basic token validation.

    NOTE:
    The current project setup does not yet contain Clerk JWKS/public-key
    verification. This function therefore validates JWT structure, payload,
    expiry, and subject only. Cryptographic Clerk verification should be added
    when CLERK_JWT_KEY / the Clerk backend SDK is wired into the project.
    """
    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format",
        )
    # implement with jwt decode
    payload = ''

    exp = payload.get("exp")
    if exp is not None:
        try:
            if datetime.fromtimestamp(exp, tz=timezone.utc) <= datetime.now(timezone.utc):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token expired",
                )
        except (TypeError, ValueError, OverflowError):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token expiry",
            )

    if not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject",
        )

    return payload





# ---------------------------------------------------------------------------
# Authentication / roles
# ---------------------------------------------------------------------------


def get_current_user(
    authorization: Annotated[str, Header()],
    db: Session = Depends(get_db),
) -> User:
# # TODO: Implement proper Clerk JWT verification.
# The current development authentication is temporary and must not
# be used in production.  
    return


def require_caregiver(
    user: User = Depends(get_current_user),
) -> User:
    """Require the authenticated user to be a caregiver."""
    if user.role != UserRole.CAREGIVER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Caregiver role required",
        )
    return user


def require_child_role(
    user: User = Depends(get_current_user),
) -> User:
    """Require the authenticated user to be a child."""
    if user.role != UserRole.CHILD:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Child role required",
        )
    return user


# ---------------------------------------------------------------------------
# Child access
# ---------------------------------------------------------------------------


def _get_child(db: Session, child_id: int) -> Child:
    """Get an active child profile by ID."""
    child = db.execute(
        select(Child).where(
            Child.id == child_id,
            Child.is_deleted.is_(False),
        )
    ).scalar_one_or_none()

    if child is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child not found",
        )

    return child


def get_child_for_user(db: Session, user: User) -> Child:
    """Get the active child profile linked to a CHILD-role user."""
    child = db.execute(
        select(Child).where(
            Child.user_id == user.id,
            Child.is_deleted.is_(False),
        )
    ).scalar_one_or_none()

    if child is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child profile not found for this user",
        )

    return child


def verify_child_ownership(
    db: Session,
    child_id: int,
    caregiver: User,
) -> Child:
    """Require that the caregiver owns the child."""
    child = _get_child(db, child_id)

    if child.caregiver_id != caregiver.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized for this child",
        )

    return child


def verify_child_access(
    db: Session,
    child_id: int,
    user: User,
) -> Child:
    """
    Require access to a child:
    - caregiver -> must own the child
    - child -> must be the linked child
    """
    child = _get_child(db, child_id)

    if user.role == UserRole.CAREGIVER:
        allowed = child.caregiver_id == user.id
    elif user.role == UserRole.CHILD:
        allowed = child.user_id == user.id
    else:
        allowed = False

    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized for this child",
        )

    return child


# ---------------------------------------------------------------------------
# Task access
# ---------------------------------------------------------------------------


def _get_task(db: Session, task_id: int) -> Task:
    """Get an active task by ID."""
    task = db.execute(
        select(Task).where(
            Task.id == task_id,
            Task.is_deleted.is_(False),
        )
    ).scalar_one_or_none()

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    return task


def verify_task_access(
    db: Session,
    task_id: int,
    user: User,
) -> Task:
    """
    Require access to a task:
    - caregiver -> must own the child assigned to the task
    - child -> task must belong to their child profile
    """
    task = _get_task(db, task_id)
    child = _get_child(db, task.child_id)

    if user.role == UserRole.CAREGIVER:
        allowed = child.caregiver_id == user.id
    elif user.role == UserRole.CHILD:
        allowed = child.user_id == user.id
    else:
        allowed = False

    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized for this task",
        )

    return task


def verify_task_child_only(
    db: Session,
    task_id: int,
    user: User,
) -> Task:
    """Require a CHILD user and verify that the task belongs to them."""
    if user.role != UserRole.CHILD:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Child role required",
        )

    child = get_child_for_user(db, user)
    task = _get_task(db, task_id)

    if task.child_id != child.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized for this task",
        )

    return task


# ---------------------------------------------------------------------------
# Progress / multi-child access
# ---------------------------------------------------------------------------


def get_authorized_child_ids(
    db: Session,
    user: User,
) -> list[int]:
    """
    Return child IDs visible to the user.

    CAREGIVER -> all active children owned by them.
    CHILD     -> their own active child profile.
    """
    if user.role == UserRole.CAREGIVER:
        return list(
            db.execute(
                select(Child.id).where(
                    Child.caregiver_id == user.id,
                    Child.is_deleted.is_(False),
                )
            ).scalars().all()
        )

    if user.role == UserRole.CHILD:
        return [get_child_for_user(db, user).id]

    return []
