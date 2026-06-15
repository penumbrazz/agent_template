from typing import Optional

from sqlalchemy.orm import Session

from app.models.llm_model import LLMModel
from app.schemas.llm_model import ModelCreate, ModelUpdate
from app.services.setting import clear_default_model_if_matches


def to_read(m: LLMModel) -> dict:
    """Convert an LLMModel ORM instance to a read-friendly dictionary."""
    return {
        "id": m.id,
        "provider_id": m.provider_id,
        "model_id": m.model_id,
        "display_name": m.display_name,
        "is_enabled": m.is_enabled,
        "extra_config": m.extra_config,
        "model_type": m.model_type,
        "context_length": m.context_length,
        "max_output_tokens": m.max_output_tokens,
        "provider_name": m.provider.name if m.provider else None,
        "created_at": m.created_at,
        "updated_at": m.updated_at,
    }


def list_enabled_models(db: Session) -> list[LLMModel]:
    """Return all enabled models ordered by creation date descending."""
    return (
        db.query(LLMModel)
        .filter(LLMModel.is_enabled == True)
        .order_by(LLMModel.created_at.desc())
        .all()
    )


def list_all_models(db: Session) -> list[LLMModel]:
    """Return all models ordered by creation date descending."""
    return db.query(LLMModel).order_by(LLMModel.created_at.desc()).all()


def get_model(db: Session, model_id: str) -> Optional[LLMModel]:
    """Return the model with the given ID, or None if not found."""
    return db.query(LLMModel).filter(LLMModel.id == model_id).first()


def create_model(db: Session, data: ModelCreate) -> LLMModel:
    """Create and persist a new LLM model from the given data."""
    model = LLMModel(
        provider_id=data.provider_id,
        model_id=data.model_id,
        display_name=data.display_name,
        extra_config=data.extra_config,
        model_type=data.model_type,
        context_length=data.context_length,
        max_output_tokens=data.max_output_tokens,
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    return model


_UPDATABLE_MODEL_FIELDS = {
    "model_id",
    "display_name",
    "extra_config",
    "model_type",
    "context_length",
    "max_output_tokens",
}


def update_model(db: Session, model: LLMModel, data: ModelUpdate) -> LLMModel:
    """Update a model's fields from partial update data."""
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in _UPDATABLE_MODEL_FIELDS:
            setattr(model, field, value)
    db.commit()
    db.refresh(model)
    return model


def delete_model(db: Session, model: LLMModel) -> None:
    """Delete a model and clear the default model setting if it matches."""
    clear_default_model_if_matches(db, model.id)
    db.delete(model)
    db.commit()


def toggle_model(db: Session, model: LLMModel) -> LLMModel:
    """Toggle a model's enabled state, clearing defaults if disabled."""
    model.is_enabled = not model.is_enabled
    if not model.is_enabled:
        clear_default_model_if_matches(db, model.id)
    db.commit()
    db.refresh(model)
    return model
