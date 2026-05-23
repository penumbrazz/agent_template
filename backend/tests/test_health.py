from fastapi.testclient import TestClient

from app.main import app


def test_health_check_returns_ok():
    client = TestClient(app)

    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_check_works_when_otel_disabled(monkeypatch):
    monkeypatch.setenv("OTEL_ENABLED", "false")
    client = TestClient(app)

    response = client.get("/api/health")

    assert response.status_code == 200
