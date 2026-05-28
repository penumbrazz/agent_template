"""Integration test: create provider → add model → toggle → set default → cleanup."""


class TestFullFlow:
    def test_provider_model_settings_flow(self, admin_user, client):
        # 1. Create provider
        resp = client.post(
            "/api/providers",
            headers=admin_user,
            json={
                "name": "TestFlow",
                "type": "openai_compatible",
                "base_url": "https://api.test.com",
                "api_key": "sk-test-integration-key",
            },
        )
        assert resp.status_code == 201
        provider_id = resp.json()["id"]

        # 2. Add model manually
        resp = client.post(
            "/api/models",
            headers=admin_user,
            json={
                "provider_id": provider_id,
                "model_id": "test-model-v1",
                "display_name": "Test Model",
            },
        )
        assert resp.status_code == 201
        model_id = resp.json()["id"]

        # 3. Toggle model on
        resp = client.patch(f"/api/models/{model_id}/toggle", headers=admin_user)
        assert resp.status_code == 200
        assert resp.json()["is_enabled"] is True

        # 4. Verify model appears in enabled list
        resp = client.get("/api/models", headers=admin_user)
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        assert resp.json()[0]["id"] == model_id

        # 5. Set default model
        resp = client.put(
            "/api/settings/default_model_id",
            headers=admin_user,
            json={"value": model_id},
        )
        assert resp.status_code == 200

        # 6. Verify settings
        resp = client.get("/api/settings", headers=admin_user)
        assert resp.status_code == 200
        default_setting = next(
            (s for s in resp.json() if s["key"] == "default_model_id"), None
        )
        assert default_setting is not None
        assert default_setting["value"] == model_id

        # 7. Toggle model off (should clear default)
        resp = client.patch(f"/api/models/{model_id}/toggle", headers=admin_user)
        assert resp.json()["is_enabled"] is False

        resp = client.get("/api/settings", headers=admin_user)
        default_setting = next(
            (s for s in resp.json() if s["key"] == "default_model_id"), None
        )
        if default_setting:
            assert default_setting["value"] == ""

        # 8. Delete model
        resp = client.delete(f"/api/models/{model_id}", headers=admin_user)
        assert resp.status_code == 204

        # 9. Delete provider
        resp = client.delete(f"/api/providers/{provider_id}", headers=admin_user)
        assert resp.status_code == 204
