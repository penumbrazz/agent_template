import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.session import get_db
from app.main import app
from app.models.base import Base
from app.services.auth import create_access_token, get_password_hash

TEST_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def test_user(client):
    """Create a normal user and return their auth headers."""
    client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "testpass123",
        },
    )
    resp = client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "testpass123"},
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_user(client):
    """Create a superuser and return their auth headers."""
    # Register via API
    client.post(
        "/api/auth/register",
        json={
            "username": "admin",
            "email": "admin@example.com",
            "password": "adminpass123",
        },
    )
    # Promote to superuser directly in DB
    db = TestSessionLocal()
    from app.models.user import User

    user = db.query(User).filter(User.username == "admin").first()
    user.is_superuser = True
    db.commit()
    db.close()
    # Login
    resp = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "adminpass123"},
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
