from datetime import datetime

from pydantic import BaseModel, Field


class ModelCreate(BaseModel):
    provider_id: str = Field(..., min_length=1)
    model_id: str = Field(..., min_length=1, max_length=200)
    display_name: str | None = Field(None, max_length=200)
    extra_config: dict | None = None
    model_type: str = Field("llm", max_length=20)
    context_length: int | None = None
    max_output_tokens: int | None = None


class ModelUpdate(BaseModel):
    model_id: str | None = Field(None, min_length=1, max_length=200)
    display_name: str | None = Field(None, max_length=200)
    extra_config: dict | None = None
    model_type: str | None = Field(None, max_length=20)
    context_length: int | None = None
    max_output_tokens: int | None = None


class ModelRead(BaseModel):
    id: str
    provider_id: str
    model_id: str
    display_name: str | None
    is_enabled: bool
    extra_config: dict | None
    model_type: str = "llm"
    context_length: int | None = None
    max_output_tokens: int | None = None
    provider_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ModelToggleResponse(BaseModel):
    id: str
    is_enabled: bool
