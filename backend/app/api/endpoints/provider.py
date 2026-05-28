from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_superuser
from app.db.session import get_db
from app.models.user import User
from app.schemas.provider import (
    ProviderCreate,
    ProviderRead,
    ProviderTestRequest,
    ProviderUpdate,
    ProviderValidateRequest,
)
from app.services.provider import (
    _mask_key,
    create_provider,
    delete_provider,
    fetch_models,
    get_provider,
    list_providers,
    test_provider,
    update_provider,
    validate_provider,
)

router = APIRouter(prefix="/providers", tags=["providers"])


def _to_read(p) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "type": p.type,
        "base_url": p.base_url,
        "api_key_masked": _mask_key(p.encrypted_api_key),
        "is_active": p.is_active,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
    }


@router.post("/validate")
def validate_provider_endpoint(
    data: ProviderValidateRequest,
    current_user: User = Depends(require_superuser),
):
    result = validate_provider(data.base_url, data.api_key, data.provider_type.value)
    return result


@router.get("", response_model=list[ProviderRead])
def list_all_providers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    providers = list_providers(db)
    return [_to_read(p) for p in providers]


@router.post("", response_model=ProviderRead, status_code=status.HTTP_201_CREATED)
def create_new_provider(
    data: ProviderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    provider = create_provider(db, data)
    return _to_read(provider)


@router.put("/{provider_id}", response_model=ProviderRead)
def update_existing_provider(
    provider_id: str,
    data: ProviderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    provider = get_provider(db, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    provider = update_provider(db, provider, data)
    return _to_read(provider)


@router.delete("/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_provider(
    provider_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    provider = get_provider(db, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    delete_provider(db, provider)


@router.post("/{provider_id}/fetch-models")
def fetch_provider_models(
    provider_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    provider = get_provider(db, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    try:
        new_models = fetch_models(db, provider)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch models: {str(e)}",
        )
    return {
        "fetched": len(new_models),
        "models": [{"id": m.id, "model_id": m.model_id} for m in new_models],
    }


@router.post("/{provider_id}/test")
def test_provider_connection(
    provider_id: str,
    body: ProviderTestRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    provider = get_provider(db, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    model_id = body.model_id if body else None
    result = test_provider(db, provider, model_id)
    return result
