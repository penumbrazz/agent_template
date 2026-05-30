from sqlalchemy.orm import Session

from app.models.setting import Setting

ALLOWED_KEYS = {"default_model_id"}


def list_settings(db: Session) -> list[Setting]:
    """Return all application settings."""
    return db.query(Setting).all()


def get_setting(db: Session, key: str) -> Setting | None:
    """Return the setting with the given key, or None if not found."""
    return db.query(Setting).filter(Setting.key == key).first()


def upsert_setting(db: Session, key: str, value: str) -> Setting:
    """Create or update a setting with the given key and value."""
    setting = get_setting(db, key)
    if setting:
        setting.value = value
    else:
        setting = Setting(key=key, value=value)
        db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting


def clear_default_model_if_unavailable(
    db: Session, available_model_ids: set[str]
) -> None:
    """Clear the default model setting if its ID is not in the available set."""
    setting = get_setting(db, "default_model_id")
    if setting and setting.value and setting.value not in available_model_ids:
        setting.value = ""


def clear_default_model_if_matches(db: Session, model_id: str) -> None:
    """Clear the default model setting if it matches the given model ID."""
    setting = get_setting(db, "default_model_id")
    if setting and setting.value == model_id:
        setting.value = ""
