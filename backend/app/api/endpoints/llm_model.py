from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_superuser
from app.db.session import get_db
from app.models.user import User
from app.schemas.llm_model import (
    ModelCreate,
    ModelRead,
    ModelToggleResponse,
    ModelUpdate,
)
from app.services.llm_model import (
    create_model,
    delete_model,
    get_model,
    list_all_models,
    list_enabled_models,
    to_read as model_to_read,
    toggle_model,
    update_model,
)

router = APIRouter(prefix="/models", tags=["models"])


@router.get("", response_model=list[ModelRead])
def list_enabled(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all enabled LLM models."""
    models = list_enabled_models(db)
    return [model_to_read(m) for m in models]


@router.get("/all", response_model=list[ModelRead])
def list_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    """List all LLM models including disabled ones."""
    models = list_all_models(db)
    return [model_to_read(m) for m in models]


@router.post("", response_model=ModelRead, status_code=status.HTTP_201_CREATED)
def create_new_model(
    data: ModelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    """Create a new LLM model configuration."""
    model = create_model(db, data)
    return model_to_read(model)


@router.put("/{model_id}", response_model=ModelRead)
def update_existing_model(
    model_id: str,
    data: ModelUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    """Update an existing LLM model configuration."""
    model = get_model(db, model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    model = update_model(db, model, data)
    return model_to_read(model)


@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_model(
    model_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    """Delete an LLM model configuration."""
    model = get_model(db, model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    delete_model(db, model)


@router.patch("/{model_id}/toggle", response_model=ModelToggleResponse)
def toggle_model_status(
    model_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    """Toggle the enabled status of an LLM model."""
    model = get_model(db, model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    model = toggle_model(db, model)
    return {"id": model.id, "is_enabled": model.is_enabled}
