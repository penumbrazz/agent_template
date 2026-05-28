"""
Smoke test: verify the GlitchTip error reporting pipeline.

Phase 1: init_sentry() with the real DSN, send a test exception, verify event_id.
Phase 2: trigger a real 500 through a standalone FastAPI app to verify error handling.

Usage:
    python -m pytest tests/test_glitchtip_integration.py -v -s
    python tests/test_glitchtip_integration.py
"""

import pytest
import sentry_sdk
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import settings


def _has_dsn():
    return bool(settings.SENTRY_DSN)


pytestmark = pytest.mark.skipif(
    not _has_dsn(),
    reason="SENTRY_DSN not configured in backend/.env",
)


def test_glitchtip_pipeline():
    """Verify the full DSN -> init -> capture -> send pipeline."""
    from app.core.sentry import init_sentry

    # Use a fresh FastAPI instance to avoid polluting the global app
    app = FastAPI()

    @app.get("/crash")
    def crash():
        raise RuntimeError("GlitchTip smoke test: backend pipeline verification")

    init_sentry()
    sentry_sdk.capture_exception(
        RuntimeError("GlitchTip smoke test: backend pipeline verification")
    )
    sentry_sdk.flush()

    event_id = sentry_sdk.last_event_id()
    assert event_id, "sentry_sdk failed to capture. Check SENTRY_DSN in backend/.env"

    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/crash")
    assert response.status_code == 500


if __name__ == "__main__":
    test_glitchtip_pipeline()
