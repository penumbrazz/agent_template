import asyncio
import re
import time
from typing import Awaitable, Callable, Optional

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

# Concurrency limit for parallel metadata fetches during fetch_models.
METADATA_FETCH_CONCURRENCY = 6

# Matches the masked format produced by mask_api_key: 4 chars + "..." + 4 chars.
_MASKED_KEY_PATTERN = re.compile(r"^.{4}\.\.\..{4}$")

_UPDATABLE_PROVIDER_FIELDS = {"name", "type", "base_url"}


def _is_masked_key(value: str) -> bool:
    """Return True if value looks like a masked API key (xxxx...xxxx)."""
    return bool(_MASKED_KEY_PATTERN.match(value or ""))


_async_http_client: Optional[httpx.AsyncClient] = None
_client_lock = asyncio.Lock()


async def _get_async_http_client() -> httpx.AsyncClient:
    """Return the shared async httpx client, creating one if needed."""
    global _async_http_client
    if _async_http_client is not None and not _async_http_client.is_closed:
        return _async_http_client
    async with _client_lock:
        if _async_http_client is None or _async_http_client.is_closed:
            _async_http_client = httpx.AsyncClient(timeout=DEFAULT_HTTP_TIMEOUT)
        return _async_http_client


async def close_http_client() -> None:
    """Close the shared async httpx client on shutdown."""
    global _async_http_client
    async with _client_lock:
        if _async_http_client and not _async_http_client.is_closed:
            await _async_http_client.aclose()
            _async_http_client = None


def _build_headers(api_key: str, provider_type: str) -> dict[str, str]:
    """Build authentication headers based on the provider type."""
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


async def _async_timed_request(fn: Callable[[], Awaitable[None]]) -> dict:
    """Execute an async callable and return a dict with success status, latency, and error."""
    start = time.monotonic()
    try:
        await fn()
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
    """Update a provider's fields from partial update data."""
    update_data = data.model_dump(exclude_unset=True)
    if "type" in update_data and update_data["type"] is not None:
        update_data["type"] = update_data["type"].value
    if "api_key" in update_data:
        raw_key = update_data.pop("api_key")
        # Only overwrite when a real (unmasked) key is provided. Masked values
        # come straight from the read API and must not be persisted back.
        if raw_key and not _is_masked_key(raw_key):
            provider.encrypted_api_key = encrypt_api_key(raw_key)
    if "base_url" in update_data and update_data["base_url"]:
        update_data["base_url"] = _normalize_base_url(update_data["base_url"])
    for field, value in update_data.items():
        if field in _UPDATABLE_PROVIDER_FIELDS:
            setattr(provider, field, value)
    db.commit()
    db.refresh(provider)
    return provider


def delete_provider(db: Session, provider: Provider) -> None:
    """Delete a provider from the database."""
    db.delete(provider)
    db.commit()


async def fetch_models(db: Session, provider: Provider) -> list[LLMModel]:
    """Fetch models from a remote provider and sync with the database.

    Metadata fetches are performed concurrently (bounded by a semaphore) and
    outside the main transaction so a large model catalog does not hold a DB
    connection for the duration of N sequential HTTP calls.
    """
    decrypted_key = decrypt_api_key(provider.encrypted_api_key)
    base_url = _normalize_base_url(provider.base_url)
    headers = _build_headers(decrypted_key, provider.type)

    client = await _get_async_http_client()
    resp = await client.get(f"{base_url}{_models_path()}", headers=headers)
    resp.raise_for_status()

    remote_ids = set(m["id"] for m in resp.json().get("data", []))

    existing_models = (
        db.query(LLMModel).filter(LLMModel.provider_id == provider.id).all()
    )
    existing_ids = {m.model_id for m in existing_models}

    # Short transaction 1: delete stale models + clear default if needed.
    for model in existing_models:
        if model.model_id not in remote_ids:
            db.delete(model)
    remaining_model_ids = {m.id for m in existing_models if m.model_id in remote_ids}
    clear_default_model_if_unavailable(db, remaining_model_ids)
    db.commit()

    # Determine which models need metadata fetched.
    new_ids = remote_ids - existing_ids
    incomplete_existing = [
        m
        for m in existing_models
        if m.model_id in remote_ids
        and (m.context_length is None or m.max_output_tokens is None)
    ]

    # Concurrent metadata fetch outside the DB transaction.
    semaphore = asyncio.Semaphore(METADATA_FETCH_CONCURRENCY)

    async def _fetch(mid: str) -> dict:
        async with semaphore:
            return await fetch_model_metadata(client, base_url, headers, mid)

    new_metadata_list = await asyncio.gather(*(_fetch(mid) for mid in new_ids))
    existing_metadata_list = await asyncio.gather(
        *(_fetch(m.model_id) for m in incomplete_existing)
    )

    # Short transaction 2: apply fetched metadata.
    new_models: list[LLMModel] = []
    for mid, metadata in zip(new_ids, new_metadata_list):
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

    for model, metadata in zip(incomplete_existing, existing_metadata_list):
        if model.context_length is None and metadata["context_length"] is not None:
            model.context_length = metadata["context_length"]
        if (
            model.max_output_tokens is None
            and metadata["max_output_tokens"] is not None
        ):
            model.max_output_tokens = metadata["max_output_tokens"]
        if model.model_type == "llm":
            model.model_type = metadata["model_type"]

    db.commit()
    for m in new_models:
        db.refresh(m)
    return new_models


async def test_provider(
    db: Session, provider: Provider, model_id: Optional[str] = None
) -> dict:
    """Test provider connectivity by sending a minimal chat completion request."""
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

    async def make_request():
        client = await _get_async_http_client()
        if provider.type == ProviderType.OPENAI_COMPATIBLE.value:
            resp = await client.post(
                f"{base_url}/chat/completions", headers=headers, json=chat_payload
            )
        else:
            resp = await client.post(
                f"{base_url}/messages", headers=headers, json=chat_payload
            )
        resp.raise_for_status()

    return await _async_timed_request(make_request)


async def validate_provider(base_url: str, api_key: str, provider_type: str) -> dict:
    """Validate provider credentials by requesting the models endpoint."""
    url = _normalize_base_url(base_url)
    headers = _build_headers(api_key, provider_type)

    async def make_request():
        client = await _get_async_http_client()
        resp = await client.get(f"{url}{_models_path()}", headers=headers)
        resp.raise_for_status()

    return await _async_timed_request(make_request)
