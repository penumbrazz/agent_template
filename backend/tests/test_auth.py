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


from app.db.seed import seed_default_admin
from app.db.session import SessionLocal


class TestAuthLoginCookie:
    def test_login_sets_refresh_cookie(self, client):
        client.post(
            "/api/auth/register",
            json={
                "username": "cookieuser",
                "email": "cookie@example.com",
                "password": "password123",
            },
        )
        resp = client.post(
            "/api/auth/login",
            json={"username": "cookieuser", "password": "password123"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "expires_in" in data
        assert data["token_type"] == "bearer"
        cookies = resp.cookies
        assert "refresh_token" in cookies


class TestAuthRefresh:
    def test_refresh_success(self, client):
        client.post(
            "/api/auth/register",
            json={
                "username": "refreshuser",
                "email": "refresh@example.com",
                "password": "password123",
            },
        )
        client.post(
            "/api/auth/login",
            json={"username": "refreshuser", "password": "password123"},
        )
        resp = client.post("/api/auth/refresh")
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data

    def test_refresh_without_cookie(self, client):
        resp = client.post("/api/auth/refresh")
        assert resp.status_code == 401

    def test_refresh_with_invalid_token(self, client):
        client.cookies.set("refresh_token", "invalid-token", domain="testserver")
        resp = client.post("/api/auth/refresh")
        assert resp.status_code == 401


class TestAuthLogout:
    def test_logout_clears_cookie(self, client):
        client.post(
            "/api/auth/register",
            json={
                "username": "logoutuser",
                "email": "logout@example.com",
                "password": "password123",
            },
        )
        client.post(
            "/api/auth/login",
            json={"username": "logoutuser", "password": "password123"},
        )
        resp = client.post("/api/auth/logout")
        assert resp.status_code == 200
        assert resp.json()["message"] == "Logged out"


class TestSeedDefaultAdmin:
    def _make_test_db(self):
        import os
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker

        from app.models.base import Base

        test_engine = create_engine(
            "sqlite:///./test_seed.db", connect_args={"check_same_thread": False}
        )
        Base.metadata.create_all(bind=test_engine)
        TestSession = sessionmaker(
            autocommit=False, autoflush=False, bind=test_engine
        )
        test_db = TestSession()
        return test_db, test_engine

    def _cleanup(self, test_db, test_engine):
        import os
        from app.models.base import Base

        test_db.close()
        Base.metadata.drop_all(bind=test_engine)
        try:
            os.remove("test_seed.db")
        except OSError:
            pass

    def test_seed_creates_admin(self):
        from app.models.user import User
        from app.services.auth import verify_password

        test_db, test_engine = self._make_test_db()
        try:
            seed_default_admin(test_db)
            admin = test_db.query(User).filter(User.username == "admin").first()
            assert admin is not None
            assert admin.is_superuser is True
            assert admin.is_active is True
            assert verify_password("admin", admin.hashed_password)
        finally:
            self._cleanup(test_db, test_engine)

    def test_seed_idempotent(self):
        from app.models.user import User

        test_db, test_engine = self._make_test_db()
        try:
            seed_default_admin(test_db)
            seed_default_admin(test_db)
            count = test_db.query(User).filter(User.username == "admin").count()
            assert count == 1
        finally:
            self._cleanup(test_db, test_engine)

    def test_seed_resets_wrong_password(self):
        from app.models.user import User
        from app.services.auth import get_password_hash, verify_password

        test_db, test_engine = self._make_test_db()
        try:
            admin = User(
                username="admin",
                email="old@admin.com",
                hashed_password=get_password_hash("wrong-password"),
                is_superuser=True,
                is_active=True,
            )
            test_db.add(admin)
            test_db.commit()
            seed_default_admin(test_db)
            admin = test_db.query(User).filter(User.username == "admin").first()
            assert verify_password("admin", admin.hashed_password)
        finally:
            self._cleanup(test_db, test_engine)

    def test_seed_fixes_missing_superuser(self):
        from app.models.user import User
        from app.services.auth import get_password_hash

        test_db, test_engine = self._make_test_db()
        try:
            admin = User(
                username="admin",
                email="old@admin.com",
                hashed_password=get_password_hash("admin"),
                is_superuser=False,
                is_active=True,
            )
            test_db.add(admin)
            test_db.commit()
            seed_default_admin(test_db)
            admin = test_db.query(User).filter(User.username == "admin").first()
            assert admin.is_superuser is True
        finally:
            self._cleanup(test_db, test_engine)
