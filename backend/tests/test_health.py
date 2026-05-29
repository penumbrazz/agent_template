from fastapi.testclient import TestClient


def test_health_check_returns_ok(client: TestClient):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_check_works_when_otel_disabled(client: TestClient, monkeypatch):
    monkeypatch.setenv("OTEL_ENABLED", "false")

    response = client.get("/api/health")

    assert response.status_code == 200
