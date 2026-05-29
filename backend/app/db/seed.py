import structlog
from sqlalchemy.orm import Session

from app.models.user import User
from app.services.auth import get_password_hash

logger = structlog.get_logger("seed")

DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "admin"
DEFAULT_ADMIN_EMAIL = "admin@localhost"


def seed_default_admin(db: Session) -> None:
    existing = db.query(User).filter(User.username == DEFAULT_ADMIN_USERNAME).first()
    if existing:
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
