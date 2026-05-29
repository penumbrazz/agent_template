from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class ProviderType(str, Enum):
    OPENAI_COMPATIBLE = "openai_compatible"
    ANTHROPIC_COMPATIBLE = "anthropic_compatible"


class ProviderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    type: ProviderType
    base_url: str = Field(..., min_length=1, max_length=500)
    api_key: str = Field("")


class ProviderUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    type: ProviderType | None = None
    base_url: str | None = Field(None, min_length=1, max_length=500)
    api_key: str | None = None


class ProviderRead(BaseModel):
    id: str
    name: str
    type: str
    base_url: str
    api_key_masked: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProviderTestRequest(BaseModel):
    model_id: str | None = None


class ProviderValidateRequest(BaseModel):
    base_url: str = Field(..., min_length=1, max_length=500)
    api_key: str = Field("")
    provider_type: ProviderType


class ProviderValidateResponse(BaseModel):
    success: bool
    latency_ms: int = 0
    error: str | None = None
