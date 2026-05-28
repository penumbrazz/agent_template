from datetime import datetime

from pydantic import BaseModel, Field


class SettingRead(BaseModel):
    id: str
    key: str
    value: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class SettingUpdate(BaseModel):
    value: str = Field(..., min_length=1)
