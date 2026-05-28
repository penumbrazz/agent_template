class TestAuthRegister:
    def test_register_success(self, client):
        resp = client.post(
            "/api/auth/register",
            json={
                "username": "newuser",
                "email": "new@example.com",
                "password": "password123",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["username"] == "newuser"
        assert data["email"] == "new@example.com"
        assert "id" in data

    def test_register_duplicate_username(self, client):
        client.post(
            "/api/auth/register",
            json={
                "username": "dupuser",
                "email": "dup1@example.com",
                "password": "password123",
            },
        )
        resp = client.post(
            "/api/auth/register",
            json={
                "username": "dupuser",
                "email": "dup2@example.com",
                "password": "password123",
            },
        )
        assert resp.status_code == 409

    def test_register_duplicate_email(self, client):
        client.post(
            "/api/auth/register",
            json={
                "username": "user1",
                "email": "dup@example.com",
                "password": "password123",
            },
        )
        resp = client.post(
            "/api/auth/register",
            json={
                "username": "user2",
                "email": "dup@example.com",
                "password": "password123",
            },
        )
        assert resp.status_code == 409


class TestAuthLogin:
    def test_login_success(self, client):
        client.post(
            "/api/auth/register",
            json={
                "username": "loginuser",
                "email": "login@example.com",
                "password": "password123",
            },
        )
        resp = client.post(
            "/api/auth/login",
            json={"username": "loginuser", "password": "password123"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client):
        client.post(
            "/api/auth/register",
            json={
                "username": "wrongpw",
                "email": "wrong@example.com",
                "password": "password123",
            },
        )
        resp = client.post(
            "/api/auth/login",
            json={"username": "wrongpw", "password": "wrong"},
        )
        assert resp.status_code == 401


class TestAuthMe:
    def test_get_me_authenticated(self, test_user, client):
        resp = client.get("/api/auth/me", headers=test_user)
        assert resp.status_code == 200
        assert resp.json()["username"] == "testuser"

    def test_get_me_unauthenticated(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401
