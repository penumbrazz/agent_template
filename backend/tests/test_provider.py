from unittest.mock import MagicMock, patch


class TestProviderList:
    def test_list_empty(self, admin_user, client):
        resp = client.get("/api/providers", headers=admin_user)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_requires_auth(self, client):
        resp = client.get("/api/providers")
        assert resp.status_code == 401


class TestProviderCreate:
    def test_create_success(self, admin_user, client):
        resp = client.post(
            "/api/providers",
            headers=admin_user,
            json={
                "name": "OpenAI",
                "type": "openai_compatible",
                "base_url": "https://api.openai.com",
                "api_key": "sk-test-key-1234567890",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "OpenAI"
        assert data["type"] == "openai_compatible"
        assert "api_key_masked" in data
        assert data["api_key_masked"] != "sk-test-key-1234567890"

    def test_create_requires_superuser(self, test_user, client):
        resp = client.post(
            "/api/providers",
            headers=test_user,
            json={
                "name": "OpenAI",
                "type": "openai_compatible",
                "base_url": "https://api.openai.com",
                "api_key": "sk-test",
            },
        )
        assert resp.status_code == 403


class TestProviderUpdate:
    def test_update_name(self, admin_user, client):
        create_resp = client.post(
            "/api/providers",
            headers=admin_user,
            json={
                "name": "OpenAI",
                "type": "openai_compatible",
                "base_url": "https://api.openai.com",
                "api_key": "sk-test-key-1234567890",
            },
        )
        provider_id = create_resp.json()["id"]

        resp = client.put(
            f"/api/providers/{provider_id}",
            headers=admin_user,
            json={"name": "OpenAI Updated"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "OpenAI Updated"

    def test_update_not_found(self, admin_user, client):
        resp = client.put(
            "/api/providers/nonexistent",
            headers=admin_user,
            json={"name": "Test"},
        )
        assert resp.status_code == 404


class TestProviderDelete:
    def test_delete_success(self, admin_user, client):
        create_resp = client.post(
            "/api/providers",
            headers=admin_user,
            json={
                "name": "ToDelete",
                "type": "openai_compatible",
                "base_url": "https://api.example.com",
                "api_key": "sk-test-key-1234567890",
            },
        )
        provider_id = create_resp.json()["id"]

        resp = client.delete(f"/api/providers/{provider_id}", headers=admin_user)
        assert resp.status_code == 204

        list_resp = client.get("/api/providers", headers=admin_user)
        assert all(p["id"] != provider_id for p in list_resp.json())


class TestProviderFetchModels:
    @patch("app.services.provider.httpx.Client")
    def test_fetch_models_success(self, mock_client_cls, admin_user, client):
        create_resp = client.post(
            "/api/providers",
            headers=admin_user,
            json={
                "name": "OpenAI",
                "type": "openai_compatible",
                "base_url": "https://api.openai.com",
                "api_key": "sk-test-key-1234567890",
            },
        )
        provider_id = create_resp.json()["id"]

        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "data": [{"id": "gpt-4o"}, {"id": "gpt-4o-mini"}]
        }
        mock_resp.raise_for_status = MagicMock()
        mock_client = MagicMock()
        mock_client.get.return_value = mock_resp
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client_cls.return_value = mock_client

        resp = client.post(
            f"/api/providers/{provider_id}/fetch-models", headers=admin_user
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["fetched"] == 2

    @patch("app.services.provider.httpx.Client")
    def test_fetch_models_removes_stale_models(
        self, mock_client_cls, admin_user, client
    ):
        create_resp = client.post(
            "/api/providers",
            headers=admin_user,
            json={
                "name": "OpenAI",
                "type": "openai_compatible",
                "base_url": "https://api.openai.com",
                "api_key": "sk-test-key-1234567890",
            },
        )
        provider_id = create_resp.json()["id"]

        # First fetch: returns gpt-4o and gpt-4o-mini
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "data": [{"id": "gpt-4o"}, {"id": "gpt-4o-mini"}]
        }
        mock_resp.raise_for_status = MagicMock()
        mock_client = MagicMock()
        mock_client.get.return_value = mock_resp
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client_cls.return_value = mock_client

        client.post(f"/api/providers/{provider_id}/fetch-models", headers=admin_user)

        # Second fetch: only returns gpt-4o (simulating provider change)
        mock_resp.json.return_value = {"data": [{"id": "gpt-4o"}]}
        resp = client.post(
            f"/api/providers/{provider_id}/fetch-models", headers=admin_user
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["fetched"] == 0

        # Verify stale model was removed
        models_resp = client.get("/api/models/all", headers=admin_user)
        model_ids = [m["model_id"] for m in models_resp.json()]
        assert "gpt-4o-mini" not in model_ids
        assert "gpt-4o" in model_ids


class TestProviderTest:
    @patch("app.services.provider.httpx.Client")
    def test_connection_success(self, mock_client_cls, admin_user, client):
        create_resp = client.post(
            "/api/providers",
            headers=admin_user,
            json={
                "name": "OpenAI",
                "type": "openai_compatible",
                "base_url": "https://api.openai.com",
                "api_key": "sk-test-key-1234567890",
            },
        )
        provider_id = create_resp.json()["id"]

        # Create a model via API for testing
        client.post(
            "/api/models",
            headers=admin_user,
            json={
                "provider_id": provider_id,
                "model_id": "gpt-4o",
            },
        )

        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()
        mock_client = MagicMock()
        mock_client.post.return_value = mock_resp
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client_cls.return_value = mock_client

        resp = client.post(
            f"/api/providers/{provider_id}/test",
            headers=admin_user,
            json={"model_id": "gpt-4o"},
        )
        assert resp.status_code == 200
        assert resp.json()["success"] is True
        assert "latency_ms" in resp.json()


class TestProviderValidate:
    def test_validate_requires_auth(self, client):
        resp = client.post(
            "/api/providers/validate",
            json={
                "base_url": "https://api.openai.com",
                "api_key": "sk-test",
                "provider_type": "openai_compatible",
            },
        )
        assert resp.status_code == 401

    def test_validate_requires_superuser(self, test_user, client):
        resp = client.post(
            "/api/providers/validate",
            headers=test_user,
            json={
                "base_url": "https://api.openai.com",
                "api_key": "sk-test",
                "provider_type": "openai_compatible",
            },
        )
        assert resp.status_code == 403

    @patch("app.services.provider.httpx.Client")
    def test_validate_openai_success(self, mock_client_cls, admin_user, client):
        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()
        mock_client = MagicMock()
        mock_client.get.return_value = mock_resp
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client_cls.return_value = mock_client

        resp = client.post(
            "/api/providers/validate",
            headers=admin_user,
            json={
                "base_url": "https://api.openai.com",
                "api_key": "sk-test-key",
                "provider_type": "openai_compatible",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "latency_ms" in data

    @patch("app.services.provider.httpx.Client")
    def test_validate_connection_failure(self, mock_client_cls, admin_user, client):
        mock_client = MagicMock()
        mock_client.get.side_effect = Exception("Connection refused")
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client_cls.return_value = mock_client

        resp = client.post(
            "/api/providers/validate",
            headers=admin_user,
            json={
                "base_url": "https://bad-url.example.com",
                "api_key": "sk-test-key",
                "provider_type": "openai_compatible",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is False
        assert "Connection refused" in data["error"]
