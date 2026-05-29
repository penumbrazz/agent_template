import structlog
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.services.auth import get_password_hash, verify_password

logger = structlog.get_logger("seed")

DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "admin"
DEFAULT_ADMIN_EMAIL = "admin@localhost"


def seed_default_admin(db: Session) -> None:
    existing = db.query(User).filter(User.username == DEFAULT_ADMIN_USERNAME).first()
    if existing:
        if settings.ENVIRONMENT == "development":
            if not verify_password(DEFAULT_ADMIN_PASSWORD, existing.hashed_password):
                existing.hashed_password = get_password_hash(DEFAULT_ADMIN_PASSWORD)
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
        hashed_password=get_password_hash(DEFAULT_ADMIN_PASSWORD),
        is_superuser=True,
        is_active=True,
    )
    db.add(admin)
    db.commit()
    logger.info("seed_created", username=DEFAULT_ADMIN_USERNAME)
