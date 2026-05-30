from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin

# String length constants
USERNAME_MAX_LENGTH = 64
EMAIL_MAX_LENGTH = 255
PASSWORD_HASH_MAX_LENGTH = 255


class User(TimestampMixin, Base):
    __tablename__ = "users"

    username: Mapped[str] = mapped_column(
        String(USERNAME_MAX_LENGTH), unique=True, index=True
    )
    email: Mapped[str] = mapped_column(
        String(EMAIL_MAX_LENGTH), unique=True, index=True
    )
    hashed_password: Mapped[str] = mapped_column(String(PASSWORD_HASH_MAX_LENGTH))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    token_version: Mapped[int] = mapped_column(Integer, default=0)
