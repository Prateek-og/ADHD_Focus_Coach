"""
Progress routes:
GET /progress -> Read stored precomputed progress
GET /progress/summary -> Read stored completion and recent-progress summary
GET /progress/streak -> Read stored current streak
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    get_current_user,
    get_authorized_child_ids,
    get_child_for_user,
)
from app.models.user import User, UserRole
from app.schemas.progress import (
    ProgressResponse,
    ProgressSummaryResponse,
    StreakResponse,
)
from app.services.progress_service import ProgressService

router = APIRouter(prefix="/progress", tags=["Progress"])


def _resolve_target_child_id(db: Session, user: User, child_id: int | None) -> int:
    """Resolve the target child for progress endpoints."""

    authorized_ids = get_authorized_child_ids(db, user)

    if not authorized_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No authorized child profile found.",
        )

    if child_id is not None:
        if child_id not in authorized_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized for this child's progress.",
            )
        return child_id

    # A child user can access only their own child profile.
    if user.role == UserRole.CHILD:
        if len(authorized_ids) != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Child profile mapping is invalid.",
            )
        return authorized_ids[0]

    # A caregiver must explicitly select a child when
    # they have more than one child.
    if len(authorized_ids) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="child_id is required when accessing progress for multiple children.",
        )

    return authorized_ids[0]


@router.get("", response_model=ProgressResponse)
def get_progress(
    child_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProgressResponse:
    """Return accessible progress data using stored/precomputed values."""
    target_child_id = _resolve_target_child_id(db, current_user, child_id)
    return ProgressService.get_progress(db, target_child_id)


@router.get("/summary", response_model=ProgressSummaryResponse)
def get_progress_summary(
    child_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProgressSummaryResponse:
    """Return stored completion and recent-progress summary."""
    target_child_id = _resolve_target_child_id(db, current_user, child_id)
    return ProgressService.get_progress_summary(db, target_child_id)


@router.get("/streak", response_model=StreakResponse)
def get_streak(
    child_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreakResponse:
    """Return stored current streak."""
    target_child_id = _resolve_target_child_id(db, current_user, child_id)
    return ProgressService.get_streak(db, target_child_id)
