import time
from typing import Callable, Optional

import httpx
from sqlalchemy.orm import Session

from app.models.llm_model import LLMModel
from app.models.provider import Provider
from app.schemas.provider import ProviderCreate, ProviderType, ProviderUpdate
from app.services.model_metadata import fetch_model_metadata
from app.services.setting import clear_default_model_if_unavailable
from shared.utils.crypto import decrypt_api_key, encrypt_api_key, mask_api_key

ANTHROPIC_API_VERSION = "2023-06-01"

# HTTP timeout constants
DEFAULT_HTTP_TIMEOUT = 30.0
VALIDATE_HTTP_TIMEOUT = 15.0

_http_client: Optional[httpx.Client] = None


def _get_http_client() -> httpx.Client:
    """Return the shared httpx client, creating one if needed."""
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.Client(timeout=DEFAULT_HTTP_TIMEOUT)
    return _http_client


def _build_headers(api_key: str, provider_type: str) -> dict[str, str]:
    """Build authentication headers based on the provider type.

    Args:
        api_key: The decrypted API key.
        provider_type: The provider type string (e.g. "openai_compatible").

    Returns:
        A dict of HTTP headers for authenticating with the provider.
    """
    headers: dict[str, str] = {}
    if not api_key:
        return headers
    if provider_type == ProviderType.OPENAI_COMPATIBLE.value:
        headers["Authorization"] = f"Bearer {api_key}"
    else:
        headers["x-api-key"] = api_key
        headers["anthropic-version"] = ANTHROPIC_API_VERSION
    return headers


def _mask_key(encrypted_key: str) -> str:
    """Decrypt an API key and return its masked representation."""
    decrypted = decrypt_api_key(encrypted_key)
    if not decrypted:
        return "***"
    return mask_api_key(decrypted)


def to_read(p: Provider) -> dict:
    """Convert a Provider ORM instance to a read-friendly dictionary."""
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


def _normalize_base_url(url: str) -> str:
    """Strip trailing slashes from a base URL."""
    return url.rstrip("/")


_MODELS_API_PATH = "/models"


def _models_path() -> str:
    """Return the API path for listing models."""
    return _MODELS_API_PATH


def _timed_request(fn: Callable[[], None]) -> dict:
    """Execute a callable and return a dict with success status, latency, and error.

    Args:
        fn: A zero-argument callable to execute and time.

    Returns:
        A dict containing 'success', 'latency_ms', and 'error' keys.
    """
    start = time.monotonic()
    try:
        fn()
        latency_ms = int((time.monotonic() - start) * 1000)
        return {"success": True, "latency_ms": latency_ms, "error": None}
    except Exception as e:
        latency_ms = int((time.monotonic() - start) * 1000)
        return {"success": False, "latency_ms": latency_ms, "error": str(e)}


def list_providers(db: Session) -> list[Provider]:
    """Return all providers ordered by creation date descending."""
    return db.query(Provider).order_by(Provider.created_at.desc()).all()


def get_provider(db: Session, provider_id: str) -> Optional[Provider]:
    """Return the provider with the given ID, or None if not found."""
    return db.query(Provider).filter(Provider.id == provider_id).first()


def create_provider(db: Session, data: ProviderCreate) -> Provider:
    """Create and persist a new provider from the given data."""
    provider = Provider(
        name=data.name,
        type=data.type.value,
        base_url=_normalize_base_url(data.base_url),
        encrypted_api_key=encrypt_api_key(data.api_key),
    )
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return provider


def update_provider(db: Session, provider: Provider, data: ProviderUpdate) -> Provider:
    """Update a provider's fields from partial update data.

    Args:
        db: The database session.
        provider: The provider ORM instance to update.
        data: Partial update payload; unset fields are ignored.

    Returns:
        The updated and refreshed Provider instance.
    """
    update_data = data.model_dump(exclude_unset=True)
    if "type" in update_data and update_data["type"] is not None:
        update_data["type"] = update_data["type"].value
    if "api_key" in update_data:
        raw_key = update_data.pop("api_key")
        if raw_key and raw_key != mask_api_key(raw_key):
            provider.encrypted_api_key = encrypt_api_key(raw_key)
    if "base_url" in update_data and update_data["base_url"]:
        update_data["base_url"] = _normalize_base_url(update_data["base_url"])
    for field, value in update_data.items():
        setattr(provider, field, value)
    db.commit()
    db.refresh(provider)
    return provider


def delete_provider(db: Session, provider: Provider) -> None:
    """Delete a provider from the database."""
    db.delete(provider)
    db.commit()


def fetch_models(db: Session, provider: Provider) -> list[LLMModel]:
    """Fetch models from a remote provider and sync with the database.

    Adds newly discovered models with metadata, removes models no longer
    available remotely, and clears the default model setting if it becomes
    unavailable.

    Args:
        db: The database session.
        provider: The provider whose remote models to fetch.

    Returns:
        A list of newly created LLMModel instances.
    """
    decrypted_key = decrypt_api_key(provider.encrypted_api_key)
    base_url = _normalize_base_url(provider.base_url)
    headers = _build_headers(decrypted_key, provider.type)

    client = _get_http_client()
    resp = client.get(f"{base_url}{_models_path()}", headers=headers)
    resp.raise_for_status()

    remote_ids = set(m["id"] for m in resp.json().get("data", []))

    existing_models = (
        db.query(LLMModel).filter(LLMModel.provider_id == provider.id).all()
    )
    existing_ids = {m.model_id for m in existing_models}

    for model in existing_models:
        if model.model_id not in remote_ids:
            db.delete(model)

    remaining_model_ids = {m.id for m in existing_models if m.model_id in remote_ids}
    clear_default_model_if_unavailable(db, remaining_model_ids)

    new_ids = remote_ids - existing_ids
    new_models = []
    for mid in new_ids:
        metadata = fetch_model_metadata(client, base_url, headers, mid)
        model = LLMModel(
            provider_id=provider.id,
            model_id=mid,
            is_enabled=False,
            model_type=metadata["model_type"],
            context_length=metadata["context_length"],
            max_output_tokens=metadata["max_output_tokens"],
        )
        db.add(model)
        new_models.append(model)

    db.commit()
    for m in new_models:
        db.refresh(m)
    return new_models


def test_provider(
    db: Session, provider: Provider, model_id: Optional[str] = None
) -> dict:
    """Test provider connectivity by sending a minimal chat completion request.

    Args:
        db: The database session.
        provider: The provider to test.
        model_id: Optional model ID to use; defaults to the first available model.

    Returns:
        A dict with 'success', 'latency_ms', and 'error' keys.
    """
    decrypted_key = decrypt_api_key(provider.encrypted_api_key)

    if not model_id:
        model = db.query(LLMModel).filter(LLMModel.provider_id == provider.id).first()
        if not model:
            return {
                "success": False,
                "latency_ms": 0,
                "error": "No models available for testing",
            }
        model_id = model.model_id

    base_url = _normalize_base_url(provider.base_url)
    headers = _build_headers(decrypted_key, provider.type)
    if provider.type != ProviderType.OPENAI_COMPATIBLE.value:
        headers["content-type"] = "application/json"

    chat_payload = {
        "model": model_id,
        "messages": [{"role": "user", "content": "Hi"}],
        "max_tokens": 5,
    }

    def make_request():
        client = _get_http_client()
        if provider.type == ProviderType.OPENAI_COMPATIBLE.value:
            resp = client.post(
                f"{base_url}/chat/completions", headers=headers, json=chat_payload
            )
        else:
            resp = client.post(
                f"{base_url}/messages", headers=headers, json=chat_payload
            )
        resp.raise_for_status()

    return _timed_request(make_request)


def validate_provider(base_url: str, api_key: str, provider_type: str) -> dict:
    """Validate provider credentials by requesting the models endpoint."""
    url = _normalize_base_url(base_url)
    headers = _build_headers(api_key, provider_type)

    def make_request():
        client = httpx.Client(timeout=VALIDATE_HTTP_TIMEOUT)
        resp = client.get(f"{url}{_models_path()}", headers=headers)
        resp.raise_for_status()
        client.close()

    return _timed_request(make_request)
