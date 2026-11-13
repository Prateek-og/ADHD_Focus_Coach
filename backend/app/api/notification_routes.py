"""
Notification routes:
GET /notifications -> User's own authorized notifications
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.notification import NotificationResponse
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=list[NotificationResponse])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[NotificationResponse]:
    """List notifications accessible to the authenticated user."""
    notifs = NotificationService.get_user_notifications(db, current_user)
    return [NotificationResponse.model_validate(n) for n in notifs]
