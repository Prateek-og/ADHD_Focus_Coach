"""
Telemetry API routes.

Telemetry is available to both caregivers and children.
Events are submitted in batches and deduplicated by event_id.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.redis import check_rate_limit
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.telemetry import TelemetryBatchRequest
from app.services.telemetry_service import TelemetryService


router = APIRouter(
    prefix="/telemetry",
    tags=["Telemetry"],
)


@router.post("/events", status_code=status.HTTP_200_OK)
def record_telemetry_events(
    data: TelemetryBatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Submit a batch of product telemetry events.

    Available to both caregivers and children.

    Rate limit:
    60 requests per minute per authenticated user.

    Batch limit:
    Maximum 50 events per request.
    """

    if not check_rate_limit(
        f"telemetry:{current_user.id}",
        max_requests=60,
        window_seconds=60,
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Telemetry rate limit exceeded. Please try again later.",
        )

    return TelemetryService.record_events(
        db,
        current_user,
        data,
    )