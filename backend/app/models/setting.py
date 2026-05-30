from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin

# String length constants
SETTING_KEY_MAX_LENGTH = 100


class Setting(TimestampMixin, Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(
        String(SETTING_KEY_MAX_LENGTH), unique=True, nullable=False
    )
    value: Mapped[str] = mapped_column(Text, nullable=False)
