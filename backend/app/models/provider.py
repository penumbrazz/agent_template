from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

# String length constants
PROVIDER_NAME_MAX_LENGTH = 100
PROVIDER_TYPE_MAX_LENGTH = 20
PROVIDER_BASE_URL_MAX_LENGTH = 500


class Provider(TimestampMixin, Base):
    __tablename__ = "providers"

    name: Mapped[str] = mapped_column(String(PROVIDER_NAME_MAX_LENGTH), nullable=False)
    type: Mapped[str] = mapped_column(String(PROVIDER_TYPE_MAX_LENGTH), nullable=False)
    base_url: Mapped[str] = mapped_column(
        String(PROVIDER_BASE_URL_MAX_LENGTH), nullable=False
    )
    encrypted_api_key: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    models: Mapped[list["LLMModel"]] = relationship(
        "LLMModel", back_populates="provider", cascade="all, delete-orphan"
    )
