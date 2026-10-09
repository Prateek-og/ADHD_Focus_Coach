"""
Feedback routes:
POST /tasks/{task_id}/feedback -> Child only, tied to task via URL
GET /children/{child_id}/feedback -> Caregiver owning child
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    require_caregiver,
    require_child_role,
    get_child_for_user,
    verify_task_child_only,
    verify_child_ownership,
)
from app.models.user import User
from app.schemas.feedback import FeedbackCreate, FeedbackResponse
from app.services.feedback_service import FeedbackService

router = APIRouter(tags=["Feedback"])


@router.post(
    "/tasks/{task_id}/feedback",
    response_model=FeedbackResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_task_feedback(
    task_id: int,
    data: FeedbackCreate,
    db: Session = Depends(get_db),
    child_user: User = Depends(require_child_role),
) -> FeedbackResponse:
    """Child submits post-task FAQ feedback tied to the task."""
    task = verify_task_child_only(db, task_id, child_user)
    child = get_child_for_user(db, child_user)

    feedback = FeedbackService.submit_feedback(db, task, child, data)
    return FeedbackResponse.model_validate(feedback)


@router.get(
    "/children/{child_id}/feedback",
    response_model=list[FeedbackResponse],
)
def get_child_feedback(
    child_id: int,
    db: Session = Depends(get_db),
    caregiver: User = Depends(require_caregiver),
) -> list[FeedbackResponse]:
    """Caregiver views structured feedback for an owned child."""
    verify_child_ownership(db, child_id, caregiver)
    feedbacks = FeedbackService.get_feedback_for_child(db, child_id)
    return [FeedbackResponse.model_validate(f) for f in feedbacks]
