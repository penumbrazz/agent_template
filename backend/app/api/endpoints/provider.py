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
    create_provider,
    delete_provider,
    fetch_models,
    get_provider,
    list_providers,
    test_provider,
)
from app.services.provider import to_read as provider_to_read
from app.services.provider import (
    update_provider,
    validate_provider,
)

router = APIRouter(prefix="/providers", tags=["providers"])


@router.post("/validate")
async def validate_provider_endpoint(
    data: ProviderValidateRequest,
    current_user: User = Depends(require_superuser),
):
    """Validate provider credentials without creating."""
    result = await validate_provider(data.base_url, data.api_key, data.provider_type.value)
    return result


@router.get("", response_model=list[ProviderRead])
def list_all_providers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all configured providers."""
    providers = list_providers(db)
    return [provider_to_read(p) for p in providers]


@router.post("", response_model=ProviderRead, status_code=status.HTTP_201_CREATED)
def create_new_provider(
    data: ProviderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    """Create a new provider configuration."""
    provider = create_provider(db, data)
    return provider_to_read(provider)


@router.put("/{provider_id}", response_model=ProviderRead)
def update_existing_provider(
    provider_id: str,
    data: ProviderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    """Update an existing provider configuration."""
    provider = get_provider(db, provider_id)
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found"
        )
    provider = update_provider(db, provider, data)
    return provider_to_read(provider)


@router.delete("/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_provider(
    provider_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    """Delete a provider configuration."""
    provider = get_provider(db, provider_id)
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found"
        )
    delete_provider(db, provider)


@router.post("/{provider_id}/fetch-models")
async def fetch_provider_models(
    provider_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    """Fetch available models from a provider's API."""
    provider = get_provider(db, provider_id)
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found"
        )
    try:
        new_models = await fetch_models(db, provider)
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
async def test_provider_connection(
    provider_id: str,
    body: ProviderTestRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    """Test connectivity to a provider endpoint."""
    provider = get_provider(db, provider_id)
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found"
        )
    model_id = body.model_id if body else None
    result = await test_provider(db, provider, model_id)
    return result
