from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Agent Template"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    API_PREFIX: str = "/api"
    ENABLE_API_DOCS: bool = True

    DATABASE_URL: str = Field(
        default="mysql+pymysql://app_user:app_password@localhost:3306/agent_template"
    )
    REDIS_URL: str = "redis://localhost:6379/0"

    SECRET_KEY: str = "change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080

    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    OTEL_ENABLED: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
