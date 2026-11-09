"""Register and deactivate the authenticated user's push devices."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.device import Device
from app.models.user import User
from app.schemas.device import DeviceCreate, DeviceResponse

router = APIRouter(prefix="/devices", tags=["Devices"])


@router.post("", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
def register_device(
    data: DeviceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DeviceResponse:
    """Register or reactivate one device for the authenticated user."""
    existing = db.execute(
        select(Device).where(
            Device.user_id == current_user.id,
            Device.expo_push_token == data.expo_push_token,
        )
    ).scalar_one_or_none()

    if existing:
        existing.platform = data.platform
        existing.is_active = True
        db.commit()
        db.refresh(existing)
        return DeviceResponse.model_validate(existing)

    device = Device(
        user_id=current_user.id,
        expo_push_token=data.expo_push_token,
        platform=data.platform,
        is_active=True,
    )
    db.add(device)

    try:
        db.commit()
    except IntegrityError:
        # A concurrent registration may have inserted the same token.
        db.rollback()
        existing = db.execute(
            select(Device).where(
                Device.user_id == current_user.id,
                Device.expo_push_token == data.expo_push_token,
            )
        ).scalar_one_or_none()

        if existing is None:
            raise

        existing.platform = data.platform
        existing.is_active = True
        db.commit()
        db.refresh(existing)
        return DeviceResponse.model_validate(existing)

    db.refresh(device)
    return DeviceResponse.model_validate(device)


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Deactivate a device without deleting its registration history."""
    device = db.execute(
        select(Device).where(Device.id == device_id)
    ).scalar_one_or_none()

    if device is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found",
        )

    if device.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot deactivate another user's device",
        )

    device.is_active = False
    db.commit()
    return None
