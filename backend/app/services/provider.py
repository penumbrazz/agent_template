import time
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.models.llm_model import LLMModel
from app.models.provider import Provider
from app.schemas.provider import ProviderCreate, ProviderType, ProviderUpdate
from app.services.setting import clear_default_model_if_unavailable
from shared.utils.crypto import decrypt_api_key, encrypt_api_key, mask_api_key

_http_client: Optional[httpx.Client] = None


def _get_http_client() -> httpx.Client:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.Client(timeout=30.0)
    return _http_client


def _build_headers(api_key: str, provider_type: str) -> dict[str, str]:
    headers: dict[str, str] = {}
    if not api_key:
        return headers
    if provider_type == ProviderType.OPENAI_COMPATIBLE.value:
        headers["Authorization"] = f"Bearer {api_key}"
    else:
        headers["x-api-key"] = api_key
        headers["anthropic-version"] = "2023-06-01"
    return headers


def _mask_key(encrypted_key: str) -> str:
    decrypted = decrypt_api_key(encrypted_key)
    if not decrypted:
        return "***"
    return mask_api_key(decrypted)


def to_read(p: Provider) -> dict:
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
    return url.rstrip("/")


def _models_path(provider_type: str) -> str:
    return "/models"


def _timed_request(fn) -> dict:
    start = time.monotonic()
    try:
        fn()
        latency_ms = int((time.monotonic() - start) * 1000)
        return {"success": True, "latency_ms": latency_ms, "error": None}
    except Exception as e:
        latency_ms = int((time.monotonic() - start) * 1000)
        return {"success": False, "latency_ms": latency_ms, "error": str(e)}


def list_providers(db: Session) -> list[Provider]:
    return db.query(Provider).order_by(Provider.created_at.desc()).all()


def get_provider(db: Session, provider_id: str) -> Optional[Provider]:
    return db.query(Provider).filter(Provider.id == provider_id).first()


def create_provider(db: Session, data: ProviderCreate) -> Provider:
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
    db.delete(provider)
    db.commit()


def fetch_models(db: Session, provider: Provider) -> list[LLMModel]:
    decrypted_key = decrypt_api_key(provider.encrypted_api_key)
    base_url = _normalize_base_url(provider.base_url)
    headers = _build_headers(decrypted_key, provider.type)

    client = _get_http_client()
    resp = client.get(f"{base_url}{_models_path(provider.type)}", headers=headers)
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

    new_models = []
    for mid in remote_ids:
        if mid not in existing_ids:
            model = LLMModel(provider_id=provider.id, model_id=mid, is_enabled=False)
            db.add(model)
            new_models.append(model)

    db.commit()
    for m in new_models:
        db.refresh(m)
    return new_models


def test_provider(
    db: Session, provider: Provider, model_id: Optional[str] = None
) -> dict:
    decrypted_key = decrypt_api_key(provider.encrypted_api_key)

    if not model_id:
        model = db.query(LLMModel).filter(LLMModel.provider_id == provider.id).first()
        if not model:
            return {"success": False, "latency_ms": 0, "error": "No models available for testing"}
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
            resp = client.post(f"{base_url}/chat/completions", headers=headers, json=chat_payload)
        else:
            resp = client.post(f"{base_url}/messages", headers=headers, json=chat_payload)
        resp.raise_for_status()

    return _timed_request(make_request)


def validate_provider(base_url: str, api_key: str, provider_type: str) -> dict:
    url = _normalize_base_url(base_url)
    headers = _build_headers(api_key, provider_type)

    def make_request():
        client = httpx.Client(timeout=15.0)
        resp = client.get(f"{url}{_models_path(provider_type)}", headers=headers)
        resp.raise_for_status()
        client.close()

    return _timed_request(make_request)
