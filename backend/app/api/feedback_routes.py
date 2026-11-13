"""Feedback endpoints for child submissions and caregiver review."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    get_child_for_user,
    require_caregiver,
    require_child_role,
    verify_child_ownership,
    verify_task_child_only,
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
    verify_child_ownership(db, child_id, caregiver)
    feedbacks = FeedbackService.get_feedback_for_child(db, child_id)
    return [FeedbackResponse.model_validate(item) for item in feedbacks]
