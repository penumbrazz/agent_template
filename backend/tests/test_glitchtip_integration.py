"""
Smoke test: verify the GlitchTip error reporting pipeline.

Requires SENTRY_DSN to be configured in backend/.env.
Run only when GlitchTip service is available:

    python -m pytest tests/test_glitchtip_integration.py -v -s
    python tests/test_glitchtip_integration.py
"""

import pytest
import sentry_sdk
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import settings


def test_glitchtip_pipeline():
    """Verify the full DSN -> init -> capture -> send pipeline."""
    assert (
        settings.SENTRY_DSN
    ), "SENTRY_DSN must be configured to run GlitchTip integration tests"

    from app.core.error_tracking import init_error_tracking

    # Use a fresh FastAPI instance to avoid polluting the global app
    app = FastAPI()

    @app.get("/crash")
    def crash():
        raise RuntimeError("GlitchTip smoke test: backend pipeline verification")

    init_error_tracking()
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
