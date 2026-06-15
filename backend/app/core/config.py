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

    # Number of trusted reverse proxy hops in front of the backend.
    # 0 (default) means no proxy is trusted: the client IP is taken from the
    # transport-level peer (request.client.host) and the X-Forwarded-For
    # header is NEVER consulted. Set this to the exact number of proxies
    # (e.g. 1 for a single NGINX/Cloudflare hop, 2 for CDN + load balancer)
    # so the rightmost N hops of X-Forwarded-For are stripped and the
    # preceding entry is treated as the real client address. Values < 0 are
    # treated as 0 (no trust).
    TRUSTED_PROXY_HOPS: int = 0

    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    OTEL_ENABLED: bool = False

    LANGFUSE_SECRET_KEY: str = ""
    LANGFUSE_PUBLIC_KEY: str = ""
    LANGFUSE_HOST: str = ""

    SENTRY_DSN: str = ""  # GlitchTip DSN (uses Sentry SDK protocol)

    ENCRYPTION_KEY: str = ""

    # Optional explicit password for the initial admin user created at startup.
    # When unset in non-dev environments, the default admin is NOT seeded.
    INITIAL_ADMIN_PASSWORD: str = ""

    SENTRY_TRACES_SAMPLE_RATE: float = 1.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    def model_post_init(self, __context) -> None:
        """Validate insecure defaults after model initialization."""
        secret_key_insecure = (
            not self.SECRET_KEY or self.SECRET_KEY in _INSECURE_DEFAULTS
        )
        if self.ENVIRONMENT != "development" and secret_key_insecure:
            raise ValueError(
                "SECRET_KEY is empty or set to a known insecure default. "
                "Set a strong SECRET_KEY in production."
            )
        if self.ENVIRONMENT == "development" and secret_key_insecure:
            warnings.warn(
                "SECRET_KEY is empty or insecure. Change it before deploying.",
                stacklevel=2,
            )
        if self.ENVIRONMENT != "development" and not self.ENCRYPTION_KEY:
            raise ValueError(
                "ENCRYPTION_KEY is empty. "
                "Set a strong ENCRYPTION_KEY (32-byte Fernet key) in production."
            )


@lru_cache
def get_settings() -> Settings:
    """Return a cached application Settings instance."""
    return Settings()


settings = get_settings()
