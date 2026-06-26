import structlog
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.services.auth import get_password_hash, verify_password

logger = structlog.get_logger("seed")

DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "admin"
DEFAULT_ADMIN_EMAIL = "admin@example.com"


def _resolve_admin_password() -> str | None:
    """Return the password to use for the default admin user, or None to skip.

    In development the insecure default is allowed for convenience. In any other
    environment the operator must set INITIAL_ADMIN_PASSWORD explicitly; otherwise
    the seed step is skipped with a warning.
    """
    if settings.ENVIRONMENT == "development":
        return DEFAULT_ADMIN_PASSWORD
    password = settings.INITIAL_ADMIN_PASSWORD
    if not password:
        logger.warning(
            "seed_skipped_no_password",
            reason=(
                "INITIAL_ADMIN_PASSWORD is not set; skipping default admin "
                "seed in non-dev environment."
            ),
        )
        return None
    return password


def seed_default_admin(db: Session) -> None:
    """Create or reset the default admin user when permitted by configuration."""
    password = _resolve_admin_password()
    if password is None:
        return

    existing = db.query(User).filter(User.username == DEFAULT_ADMIN_USERNAME).first()
    if existing:
        if settings.ENVIRONMENT == "development":
            if not verify_password(password, existing.hashed_password):
                existing.hashed_password = get_password_hash(password)
            if not existing.is_superuser:
                existing.is_superuser = True
            db.commit()
            logger.info("seed_dev_reset", username=DEFAULT_ADMIN_USERNAME)
            return
        logger.info("seed_skipped", reason="admin user already exists")
        return
    admin = User(
        username=DEFAULT_ADMIN_USERNAME,
        email=DEFAULT_ADMIN_EMAIL,
        hashed_password=get_password_hash(password),
        is_superuser=True,
        is_active=True,
    )
    db.add(admin)
    db.commit()
    logger.info("seed_created", username=DEFAULT_ADMIN_USERNAME)
