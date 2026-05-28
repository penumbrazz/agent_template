from typing import Optional

from sqlalchemy.orm import Session

from app.models.llm_model import LLMModel
from app.models.setting import Setting
from app.schemas.llm_model import ModelCreate, ModelUpdate


def list_enabled_models(db: Session) -> list[LLMModel]:
    return (
        db.query(LLMModel)
        .filter(LLMModel.is_enabled == True)
        .order_by(LLMModel.created_at.desc())
        .all()
    )


def list_all_models(db: Session) -> list[LLMModel]:
    return db.query(LLMModel).order_by(LLMModel.created_at.desc()).all()


def get_model(db: Session, model_id: str) -> Optional[LLMModel]:
    return db.query(LLMModel).filter(LLMModel.id == model_id).first()


def create_model(db: Session, data: ModelCreate) -> LLMModel:
    model = LLMModel(
        provider_id=data.provider_id,
        model_id=data.model_id,
        display_name=data.display_name,
        extra_config=data.extra_config,
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    return model


def update_model(db: Session, model: LLMModel, data: ModelUpdate) -> LLMModel:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(model, field, value)
    db.commit()
    db.refresh(model)
    return model


def delete_model(db: Session, model: LLMModel) -> None:
    setting = db.query(Setting).filter(Setting.key == "default_model_id").first()
    if setting and setting.value == model.id:
        setting.value = ""
    db.delete(model)
    db.commit()


def toggle_model(db: Session, model: LLMModel) -> LLMModel:
    model.is_enabled = not model.is_enabled
    if not model.is_enabled:
        setting = db.query(Setting).filter(Setting.key == "default_model_id").first()
        if setting and setting.value == model.id:
            setting.value = ""
    db.commit()
    db.refresh(model)
    return model
