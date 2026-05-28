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

    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/agent_template"
    REDIS_URL: str = "redis://localhost:6379/0"

    SECRET_KEY: str = "change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080

    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    OTEL_ENABLED: bool = False

    LANGFUSE_SECRET_KEY: str = ""
    LANGFUSE_PUBLIC_KEY: str = ""
    LANGFUSE_HOST: str = ""

    SENTRY_DSN: str = ""  # GlitchTip DSN (uses Sentry SDK protocol)

    SENTRY_TRACES_SAMPLE_RATE: float = 1.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    def model_post_init(self, __context) -> None:
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


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
