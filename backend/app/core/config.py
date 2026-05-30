import warnings
from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_INSECURE_DEFAULTS = {"change-me", "secret", "password", "your-secret-key"}


class Settings(BaseSettings):
    PROJECT_NAME: str = "Agent Template"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    API_PREFIX: str = "/api"
    ENABLE_API_DOCS: bool = True

    DATABASE_URL: str = (
        "postgresql+psycopg2://postgres:postgres@localhost:5432/agent_template"
    )
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    REDIS_URL: str = "redis://localhost:6379/0"

    SECRET_KEY: str = "change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    OTEL_ENABLED: bool = False

    LANGFUSE_SECRET_KEY: str = ""
    LANGFUSE_PUBLIC_KEY: str = ""
    LANGFUSE_HOST: str = ""

    SENTRY_DSN: str = ""  # GlitchTip DSN (uses Sentry SDK protocol)

    ENCRYPTION_KEY: str = "12345678901234567890123456789012"

    SENTRY_TRACES_SAMPLE_RATE: float = 1.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    def model_post_init(self, __context) -> None:
        """Validate insecure defaults after model initialization."""
        if self.ENVIRONMENT != "development" and self.SECRET_KEY in _INSECURE_DEFAULTS:
            raise ValueError(
                f"SECRET_KEY is set to insecure default '{self.SECRET_KEY}'. "
                "Set a strong SECRET_KEY in production."
            )
        if self.ENVIRONMENT == "development" and self.SECRET_KEY in _INSECURE_DEFAULTS:
            warnings.warn(
                "SECRET_KEY uses an insecure default. Change it before deploying.",
                stacklevel=2,
            )
        if (
            self.ENVIRONMENT != "development"
            and self.ENCRYPTION_KEY == "12345678901234567890123456789012"
        ):
            raise ValueError(
                "ENCRYPTION_KEY is set to insecure default. "
                "Set a strong ENCRYPTION_KEY in production."
            )


@lru_cache
def get_settings() -> Settings:
    """Return a cached application Settings instance."""
    return Settings()


settings = get_settings()
