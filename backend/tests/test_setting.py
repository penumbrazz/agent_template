class TestSettingList:
    def test_list_empty(self, admin_user, client):
        resp = client.get("/api/settings", headers=admin_user)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_requires_auth(self, client):
        resp = client.get("/api/settings")
        assert resp.status_code == 401


class TestSettingUpdate:
    def test_create_new_setting(self, admin_user, client):
        resp = client.put(
            "/api/settings/default_model_id",
            headers=admin_user,
            json={"value": "some-model-id"},
        )
        assert resp.status_code == 200
        assert resp.json()["key"] == "default_model_id"
        assert resp.json()["value"] == "some-model-id"

    def test_update_existing_setting(self, admin_user, client):
        client.put(
            "/api/settings/default_model_id",
            headers=admin_user,
            json={"value": "model-1"},
        )
        resp = client.put(
            "/api/settings/default_model_id",
            headers=admin_user,
            json={"value": "model-2"},
        )
        assert resp.status_code == 200
        assert resp.json()["value"] == "model-2"

    def test_update_requires_superuser(self, test_user, client):
        resp = client.put(
            "/api/settings/test_key",
            headers=test_user,
            json={"value": "test"},
        )
        assert resp.status_code == 403
