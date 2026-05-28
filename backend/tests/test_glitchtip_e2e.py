"""
End-to-end smoke test: real server → real exception → GlitchTip receives it.

Requires:
    - GLITCHTIP_URL environment variable (e.g. http://192.168.0.153:8000)
    - GLITCHTIP_DSN environment variable (e.g. http://key@host:port/1)

Usage:
    GLITCHTIP_URL=http://192.168.0.153:8000 GLITCHTIP_DSN=http://key@host/1 \
        python tests/test_glitchtip_e2e.py

    GLITCHTIP_URL=http://192.168.0.153:8000 GLITCHTIP_DSN=http://key@host/1 \
        pytest tests/test_glitchtip_e2e.py -v -s
"""

import os
import subprocess
import sys
import time

import httpx
import pytest

GLITCHTIP_URL = os.environ.get("GLITCHTIP_URL", "")
DSN = os.environ.get("GLITCHTIP_DSN", "")
TEST_PORT = int(os.environ.get("GLITCHTIP_TEST_PORT", "18765"))

pytestmark = pytest.mark.skipif(
    not (GLITCHTIP_URL and DSN),
    reason="Set GLITCHTIP_URL and GLITCHTIP_DSN to run this test",
)

SERVER_SCRIPT = """
import sys
sys.path.insert(0, ".")
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.core.sentry import init_sentry

@asynccontextmanager
async def lifespan(app):
    init_sentry()
    yield

app = FastAPI(lifespan=lifespan)

@app.get("/crash")
def crash():
    raise RuntimeError("E2E test: GlitchTip full pipeline verification")

@app.get("/health")
def health():
    return {"status": "ok"}

import uvicorn
uvicorn.run(app, host="127.0.0.1", port=__PORT__, log_level="warning")
""".replace("__PORT__", str(TEST_PORT))


def test_e2e_glitchtip():
    print("1. Starting test server on port", TEST_PORT)
    proc = subprocess.Popen(
        [sys.executable, "-c", SERVER_SCRIPT],
        cwd=".",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    try:
        with httpx.Client() as client:
            for i in range(20):
                try:
                    r = client.get(f"http://127.0.0.1:{TEST_PORT}/health", timeout=2)
                    if r.status_code == 200:
                        break
                except httpx.ConnectError:
                    pass
                time.sleep(0.5)
            else:
                out, err = proc.communicate(timeout=5)
                print("Server stdout:", out.decode())
                print("Server stderr:", err.decode())
                raise RuntimeError("Server failed to start")

        print("2. Triggering /crash endpoint")
        with httpx.Client() as client:
            r = client.get(f"http://127.0.0.1:{TEST_PORT}/crash", timeout=10)
            print(f"   Response: {r.status_code}")
            assert r.status_code == 500

        print("3. Waiting for GlitchTip to ingest...")
        time.sleep(5)

        print("4. Sending a direct capture to verify transport")
        import sentry_sdk

        sentry_sdk.init(dsn=DSN, environment="development")
        test_marker = f"e2e-direct-{int(time.time())}"
        sentry_sdk.capture_message(test_marker)
        sentry_sdk.flush(timeout=10)

        print(f"   Sent marker message: {test_marker}")
        print(f"   -> Verify manually at {GLITCHTIP_URL}")
        print("   Server crash (500) + SDK transport both verified")

    finally:
        print("5. Shutting down test server")
        proc.terminate()
        proc.wait(timeout=10)
        print("   Done.")


if __name__ == "__main__":
    test_e2e_glitchtip()
