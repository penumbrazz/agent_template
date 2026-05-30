from sqlalchemy import JSON, Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

# String length constants
PROVIDER_ID_MAX_LENGTH = 36
MODEL_ID_MAX_LENGTH = 200
MODEL_DISPLAY_NAME_MAX_LENGTH = 200


class LLMModel(TimestampMixin, Base):
    __tablename__ = "llm_models"

    provider_id: Mapped[str] = mapped_column(
        String(PROVIDER_ID_MAX_LENGTH),
        ForeignKey("providers.id", ondelete="CASCADE"),
        nullable=False,
    )
    model_id: Mapped[str] = mapped_column(String(MODEL_ID_MAX_LENGTH), nullable=False)
    display_name: Mapped[str | None] = mapped_column(
        String(MODEL_DISPLAY_NAME_MAX_LENGTH), nullable=True
    )
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    extra_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    provider: Mapped["Provider"] = relationship("Provider", back_populates="models")
