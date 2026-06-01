import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_EMBEDDING_KEYWORDS = ("embed", "bge-", "e5-", "text-embedding", "dpr")
_RERANK_KEYWORDS = ("rerank", "reranker", "cross-encoder")
_VLM_KEYWORDS = ("vl-", "vlm", "vision", "visual", "qwen2-vl", "internvl", "cogvlm", "llava", "minicpm-v")


def infer_model_type(model_id: str) -> str:
    """Infer model type from model ID using keyword matching."""
    id_lower = model_id.lower()
    if any(kw in id_lower for kw in _RERANK_KEYWORDS):
        return "rerank"
    if any(kw in id_lower for kw in _VLM_KEYWORDS):
        return "vlm"
    if any(kw in id_lower for kw in _EMBEDDING_KEYWORDS):
        return "embedding"
    return "llm"


def fetch_model_metadata(
    client: httpx.Client,
    base_url: str,
    headers: dict[str, str],
    model_id: str,
) -> dict[str, Any]:
    """Fetch metadata for a single model from the remote API.

    Returns a dict with keys: model_type, context_length, max_output_tokens.
    Falls back gracefully on errors.
    """
    result: dict[str, Any] = {
        "model_type": infer_model_type(model_id),
        "context_length": None,
        "max_output_tokens": None,
    }
    try:
        resp = client.get(f"{base_url}/models/{model_id}", headers=headers)
        resp.raise_for_status()
        data = resp.json()

        # Extract context_length from various possible response fields
        meta = data.get("meta", {}) or {}
        model_info = meta.get("model_info", {}) or data

        for field in ("max_model_len", "max_position_embeddings", "context_length", "max_context_length"):
            val = model_info.get(field)
            if val is not None:
                result["context_length"] = int(val)
                break

        # Extract max_output_tokens
        for field in ("max_tokens", "max_output_tokens"):
            val = model_info.get(field)
            if val is not None:
                result["max_output_tokens"] = int(val)
                break
    except Exception:
        logger.debug("Failed to fetch metadata for model %s", model_id, exc_info=True)

    return result
