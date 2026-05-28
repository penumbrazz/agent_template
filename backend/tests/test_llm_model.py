from tests.conftest import TestSessionLocal

from app.models.llm_model import LLMModel


def _create_provider(client, admin_user):
    resp = client.post(
        "/api/providers",
        headers=admin_user,
        json={
            "name": "TestProvider",
            "type": "openai_compatible",
            "base_url": "https://api.example.com",
            "api_key": "sk-test-key-1234567890",
        },
    )
    return resp.json()["id"]


class TestModelList:
    def test_list_enabled_empty(self, admin_user, client):
        resp = client.get("/api/models", headers=admin_user)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_all_requires_superuser(self, test_user, client):
        resp = client.get("/api/models/all", headers=test_user)
        assert resp.status_code == 403


class TestModelCreate:
    def test_create_success(self, admin_user, client):
        provider_id = _create_provider(client, admin_user)
        resp = client.post(
            "/api/models",
            headers=admin_user,
            json={
                "provider_id": provider_id,
                "model_id": "gpt-4o",
                "display_name": "GPT-4o",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["model_id"] == "gpt-4o"
        assert data["display_name"] == "GPT-4o"
        assert data["is_enabled"] is False
        assert data["provider_name"] == "TestProvider"


class TestModelToggle:
    def test_toggle_enables_model(self, admin_user, client):
        provider_id = _create_provider(client, admin_user)
        create_resp = client.post(
            "/api/models",
            headers=admin_user,
            json={"provider_id": provider_id, "model_id": "gpt-4o"},
        )
        model_id = create_resp.json()["id"]

        resp = client.patch(f"/api/models/{model_id}/toggle", headers=admin_user)
        assert resp.status_code == 200
        assert resp.json()["is_enabled"] is True

        resp = client.patch(f"/api/models/{model_id}/toggle", headers=admin_user)
        assert resp.json()["is_enabled"] is False


class TestModelDelete:
    def test_delete_success(self, admin_user, client):
        provider_id = _create_provider(client, admin_user)
        create_resp = client.post(
            "/api/models",
            headers=admin_user,
            json={"provider_id": provider_id, "model_id": "gpt-4o"},
        )
        model_id = create_resp.json()["id"]

        resp = client.delete(f"/api/models/{model_id}", headers=admin_user)
        assert resp.status_code == 204
