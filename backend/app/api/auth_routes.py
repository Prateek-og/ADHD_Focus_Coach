
"""
Authentication routes.

POST /auth/onboard -> Create the application user after Clerk authentication.
GET  /auth/me      -> Return the current application user.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_clerk_identity, get_current_user
from app.models.user import User
from app.schemas.user import UserOnboardRequest, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/onboard", response_model=UserResponse)
def onboard_user(
    request: UserOnboardRequest,
    clerk_user_id: str = Depends(get_clerk_identity),
    db: Session = Depends(get_db),
) -> UserResponse:
    """Register a verified Clerk identity in the application."""

    existing_user = db.execute(
        select(User).where(User.clerk_user_id == clerk_user_id)
    ).scalar_one_or_none()

    if existing_user is not None:
        if existing_user.role != request.role:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Your application role is already set and cannot "
                    "be changed through onboarding."
                ),
            )

        return UserResponse.model_validate(existing_user)

    user = User(
        clerk_user_id=clerk_user_id,
        role=request.role,
    )

    db.add(user)

    try:
        db.commit()
        db.refresh(user)
        return UserResponse.model_validate(user)

    except IntegrityError:
        # Another simultaneous request may have created this user first.
        db.rollback()

        existing_user = db.execute(
            select(User).where(User.clerk_user_id == clerk_user_id)
        ).scalar_one_or_none()

        if existing_user is not None:
            if existing_user.role != request.role:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Application role has already been assigned.",
                )

            return UserResponse.model_validate(existing_user)

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Could not register user; retry the request.",
        )


# @router.get("/me", response_model=UserResponse)
# def get_me(
#     current_user: User = Depends(get_current_user),
# ) -> UserResponse:
#     """Return the authenticated application user's identity and role."""
#     return UserResponse.model_validate(current_user)
@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "clerk_user_id": current_user.clerk_user_id,
        "role": str(current_user.role),
    }