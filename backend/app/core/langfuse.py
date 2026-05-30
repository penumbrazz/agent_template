import logging

from langfuse import Langfuse

from app.core.config import settings

logger = logging.getLogger("langfuse")

_client: Langfuse | None = None


def init_langfuse() -> Langfuse | None:
    """Initialize the Langfuse observability client."""
    global _client
    if not settings.LANGFUSE_SECRET_KEY:
        return None
    try:
        _client = Langfuse(
            secret_key=settings.LANGFUSE_SECRET_KEY,
            public_key=settings.LANGFUSE_PUBLIC_KEY,
            host=settings.LANGFUSE_HOST,
        )
        return _client
    except Exception:
        logger.warning("Failed to initialize Langfuse client", exc_info=True)
        _client = None
        return None


def get_langfuse() -> Langfuse | None:
    """Return the initialized Langfuse client instance."""
    return _client


def shutdown_langfuse() -> None:
    """Flush pending events and release the Langfuse client."""
    global _client
    if _client is not None:
        _client.flush()
        _client = None
