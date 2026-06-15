import logging
import sys

from slowapi import Limiter

from app.core.config import settings

logger = logging.getLogger(__name__)


def _running_under_pytest() -> bool:
    """Detect whether the process was started by pytest.

    Used only to keep the unit/integration tests independent of a running
    Redis broker: when true, the limiter is wired to in-memory storage
    regardless of ``REDIS_URL``. pytest is never imported in production
    runtime, so this branch is inert outside the test suite.
    """
    return "pytest" in sys.modules


def _get_client_ip(request) -> str:
    """Return the client IP used for rate limiting.

    Security model:
        By default (``TRUSTED_PROXY_HOPS == 0``) we trust NO proxy, so the
        X-Forwarded-For header is ignored and the transport-level peer
        (``request.client.host``) is used. A client forging
        ``X-Forwarded-For: 1.2.3.4`` therefore cannot move its traffic to a
        fresh counter and bypass the limiter.

        When the deployment sits behind a known number of reverse proxies,
        operators set ``TRUSTED_PROXY_HOPS = N``. The X-Forwarded-For header
        is a comma-separated list ``client, hop1, hop2, ...`` appended by each
        proxy. We strip the rightmost ``N`` entries (the trusted hops) and use
        the entry immediately to the left as the real client. If the header
        does not contain enough entries we fall back to the peer address, which
        is the safe default.
    """
    peer = request.client.host if request.client else "127.0.0.1"
    hops = settings.TRUSTED_PROXY_HOPS
    if hops is None or hops <= 0:
        return peer

    forwarded = request.headers.get("X-Forwarded-For")
    if not forwarded:
        return peer

    parts = [segment.strip() for segment in forwarded.split(",") if segment.strip()]
    if len(parts) <= hops:
        # Header has fewer entries than trusted hops; trust nothing and use
        # the transport peer to avoid honoring a spoofable prefix.
        return peer
    return parts[-(hops + 1)]


def _resolve_storage_uri() -> str | None:
    """Resolve the limiter storage URI.

    Returns the configured ``REDIS_URL`` when present so that multiple uvicorn
    workers share a single counter store. When Redis is not configured we
    return ``None`` (slowapi then uses in-memory storage) and emit a single
    warning so local development stays usable without a Redis broker.

    The unit tests exercise the limiter via the shared ``conftest.py`` which
    calls ``limiter.reset()``; that must not require a live Redis instance, so
    under pytest we always use in-memory storage (and stay silent about it).
    """
    if _running_under_pytest():
        return None

    redis_url = (settings.REDIS_URL or "").strip()
    if redis_url:
        return redis_url

    global _redis_fallback_warned
    if not _redis_fallback_warned:
        logger.warning(
            "REDIS_URL is not set; rate limiter falls back to in-memory storage. "
            "This is NOT safe for multi-worker deployments (uvicorn --workers N). "
            "Set REDIS_URL in production."
        )
        _redis_fallback_warned = True
    return None


_redis_fallback_warned = False

limiter = Limiter(key_func=_get_client_ip, storage_uri=_resolve_storage_uri())
