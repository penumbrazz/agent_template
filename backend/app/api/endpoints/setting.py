from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_superuser
from app.db.session import get_db
from app.models.user import User
from app.schemas.setting import SettingRead, SettingUpdate
from app.services.setting import ALLOWED_KEYS, list_settings, upsert_setting

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=list[SettingRead])
def get_all_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    """List all application settings (superuser only)."""
    return list_settings(db)


@router.put("/{key}", response_model=SettingRead)
def update_setting(
    key: str,
    data: SettingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    """Update an application setting by key."""
    if key not in ALLOWED_KEYS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown setting key: {key}",
        )
    setting = upsert_setting(db, key, data.value)
    return setting
