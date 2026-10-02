"""
Device routes:
POST /devices -> Register caller's Expo push token and device platform
DELETE /devices/{device_id} -> Deactivate/remove caller's registered push device
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
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
    """Register caller's Expo push token and device platform."""
    # Check if device token already registered for this user
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
    db.commit()
    db.refresh(device)
    return DeviceResponse.model_validate(device)


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Deactivate or remove caller's registered push device."""
    device = db.execute(
        select(Device).where(Device.id == device_id)
    ).scalar_one_or_none()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found",
        )

    if device.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete another user's device",
        )

    db.delete(device)
    db.commit()
    return None
