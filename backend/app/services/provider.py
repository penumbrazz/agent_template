import time
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.models.llm_model import LLMModel
from app.models.provider import Provider
from app.schemas.provider import ProviderCreate, ProviderType, ProviderUpdate
from shared.utils.crypto import decrypt_api_key, encrypt_api_key, mask_api_key


def _mask_key(encrypted_key: str) -> str:
    decrypted = decrypt_api_key(encrypted_key)
    if not decrypted:
        return "***"
    return mask_api_key(decrypted)


def list_providers(db: Session) -> list[Provider]:
    return db.query(Provider).order_by(Provider.created_at.desc()).all()


def get_provider(db: Session, provider_id: str) -> Optional[Provider]:
    return db.query(Provider).filter(Provider.id == provider_id).first()


def create_provider(db: Session, data: ProviderCreate) -> Provider:
    provider = Provider(
        name=data.name,
        type=data.type.value,
        base_url=data.base_url.rstrip("/"),
        encrypted_api_key=encrypt_api_key(data.api_key),
    )
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return provider


def update_provider(
    db: Session, provider: Provider, data: ProviderUpdate
) -> Provider:
    update_data = data.model_dump(exclude_unset=True)
    if "type" in update_data and update_data["type"] is not None:
        update_data["type"] = update_data["type"].value
    if "api_key" in update_data:
        raw_key = update_data.pop("api_key")
        if raw_key and raw_key != mask_api_key(raw_key):
            provider.encrypted_api_key = encrypt_api_key(raw_key)
    if "base_url" in update_data and update_data["base_url"]:
        update_data["base_url"] = update_data["base_url"].rstrip("/")
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
    if not decrypted_key:
        raise ValueError("Failed to decrypt API key")

    base_url = provider.base_url.rstrip("/")
    headers = {}

    if provider.type == ProviderType.OPENAI_COMPATIBLE.value:
        headers["Authorization"] = f"Bearer {decrypted_key}"
    else:
        headers["x-api-key"] = decrypted_key
        headers["anthropic-version"] = "2023-06-01"

    with httpx.Client(timeout=30.0) as client:
        resp = client.get(f"{base_url}/v1/models", headers=headers)
        resp.raise_for_status()

    remote_ids = [m["id"] for m in resp.json().get("data", [])]

    existing_ids = {
        m.model_id for m in db.query(LLMModel).filter(LLMModel.provider_id == provider.id).all()
    }

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
    if not decrypted_key:
        return {"success": False, "latency_ms": 0, "error": "Failed to decrypt API key"}

    if not model_id:
        model = (
            db.query(LLMModel)
            .filter(LLMModel.provider_id == provider.id)
            .first()
        )
        if not model:
            return {"success": False, "latency_ms": 0, "error": "No models available for testing"}
        model_id = model.model_id

    base_url = provider.base_url.rstrip("/")
    start = time.monotonic()

    try:
        with httpx.Client(timeout=30.0) as client:
            if provider.type == ProviderType.OPENAI_COMPATIBLE.value:
                resp = client.post(
                    f"{base_url}/v1/chat/completions",
                    headers={"Authorization": f"Bearer {decrypted_key}"},
                    json={
                        "model": model_id,
                        "messages": [{"role": "user", "content": "Hi"}],
                        "max_tokens": 5,
                    },
                )
            else:
                resp = client.post(
                    f"{base_url}/v1/messages",
                    headers={
                        "x-api-key": decrypted_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": model_id,
                        "messages": [{"role": "user", "content": "Hi"}],
                        "max_tokens": 5,
                    },
                )
            resp.raise_for_status()
        latency_ms = int((time.monotonic() - start) * 1000)
        return {"success": True, "latency_ms": latency_ms, "error": None}
    except Exception as e:
        latency_ms = int((time.monotonic() - start) * 1000)
        return {"success": False, "latency_ms": latency_ms, "error": str(e)}
