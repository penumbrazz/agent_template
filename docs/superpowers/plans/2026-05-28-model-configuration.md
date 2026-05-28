# 模型配置功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Agent Template 添加完整的模型配置管理功能——后端 Provider/Model/Settings CRUD API + 前端设置面板 UI。

**Architecture:** 后端采用 FastAPI 分层架构（models → schemas → services → endpoints），使用 SQLAlchemy 2.0 ORM + Alembic 迁移管理数据库表。前端使用 Next.js + shadcn/ui 组件库构建设置面板（Sheet 抽屉式弹窗），通过已有的 HTTP 客户端与后端通信。

**Tech Stack:** FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, httpx (后端); Next.js 15, React 19, shadcn/ui, Tailwind CSS, SWR (前端); AES-256-GCM (加密, 来自 shared/utils/crypto.py)

---

## 文件结构

### 后端 — 新建文件

| 文件 | 职责 |
|------|------|
| `backend/app/models/provider.py` | Provider ORM 模型 |
| `backend/app/models/model.py` | Model ORM 模型（`model` 是 Python 保留字,用 `llm_model.py` 避免）→ 实际文件名 `llm_model.py`，类名 `LLMModel` |
| `backend/app/models/setting.py` | Setting ORM 模型 |
| `backend/app/schemas/provider.py` | Provider Pydantic schemas |
| `backend/app/schemas/llm_model.py` | Model Pydantic schemas |
| `backend/app/schemas/setting.py` | Setting Pydantic schemas |
| `backend/app/services/provider.py` | Provider 业务逻辑（CRUD + fetch-models + test） |
| `backend/app/services/llm_model.py` | Model 业务逻辑（CRUD + toggle） |
| `backend/app/services/setting.py` | Setting 业务逻辑 |
| `backend/app/api/deps.py` | 认证依赖注入（get_current_user, require_superuser） |
| `backend/app/api/endpoints/provider.py` | Provider API 端点 |
| `backend/app/api/endpoints/llm_model.py` | Model API 端点 |
| `backend/app/api/endpoints/setting.py` | Setting API 端点 |
| `backend/app/api/endpoints/auth.py` | Auth API 端点（登录/注册, 激活已有脚手架） |
| `backend/tests/conftest.py` | 测试 fixtures（db session, test client, auth helpers） |
| `backend/tests/test_auth.py` | Auth 端点测试 |
| `backend/tests/test_provider.py` | Provider 端点测试 |
| `backend/tests/test_llm_model.py` | Model 端点测试 |
| `backend/tests/test_setting.py` | Setting 端点测试 |

### 后端 — 修改文件

| 文件 | 变更 |
|------|------|
| `backend/app/models/__init__.py` | 导出所有模型 |
| `backend/alembic/env.py` | 导入新模型 |
| `backend/app/api/router.py` | 注册新路由 |
| `backend/app/core/config.py` | 添加 `ENCRYPTION_KEY` 配置 |

### 前端 — 新建文件

| 文件 | 职责 |
|------|------|
| `frontend/src/components/ui/button.tsx` | shadcn/ui Button 组件 |
| `frontend/src/components/ui/input.tsx` | shadcn/ui Input 组件 |
| `frontend/src/components/ui/dialog.tsx` | shadcn/ui Dialog 组件 |
| `frontend/src/components/ui/sheet.tsx` | shadcn/ui Sheet 组件 |
| `frontend/src/components/ui/switch.tsx` | shadcn/ui Switch 组件 |
| `frontend/src/components/ui/select.tsx` | shadcn/ui Select 组件 |
| `frontend/src/components/ui/table.tsx` | shadcn/ui Table 组件 |
| `frontend/src/components/ui/tooltip.tsx` | shadcn/ui Tooltip 组件 |
| `frontend/src/components/ui/label.tsx` | shadcn/ui Label 组件 |
| `frontend/src/components/ui/badge.tsx` | shadcn/ui Badge 组件 |
| `frontend/src/components/settings/settings-panel.tsx` | 设置面板主组件 |
| `frontend/src/components/settings/general-settings.tsx` | 通用设置页 |
| `frontend/src/components/settings/model-config.tsx` | 模型配置页 |
| `frontend/src/components/settings/provider-form-dialog.tsx` | Provider 添加/编辑弹窗 |
| `frontend/src/components/settings/model-form-dialog.tsx` | 手动添加模型弹窗 |
| `frontend/src/components/settings/test-model-dialog.tsx` | 测试模型弹窗 |
| `frontend/src/apis/providers.ts` | Provider API 调用 |
| `frontend/src/apis/models.ts` | Model API 调用 |
| `frontend/src/apis/settings.ts` | Settings API 调用 |
| `frontend/src/types/provider.ts` | Provider 类型定义 |
| `frontend/src/types/model.ts` | Model 类型定义 |
| `frontend/src/types/setting.ts` | Setting 类型定义 |

### 前端 — 修改文件

| 文件 | 变更 |
|------|------|
| `frontend/src/apis/client.ts` | 添加 PATCH 方法 + auth token 支持 |
| `frontend/src/app/page.tsx` | 添加设置按钮入口 |
| `frontend/src/app/globals.css` | 补充 shadcn/ui 必要的 CSS 变量 |
| `frontend/tailwind.config.js` | 补充 shadcn/ui 必要的动画类 |

---

## Task 1: 后端数据库模型 + Alembic 迁移

**Files:**
- Create: `backend/app/models/provider.py`
- Create: `backend/app/models/llm_model.py`
- Create: `backend/app/models/setting.py`
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/alembic/env.py`
- Modify: `backend/app/core/config.py`
- Test: `backend/tests/test_models.py`

- [ ] **Step 1: 在 config.py 中添加 ENCRYPTION_KEY 配置**

```python
# 在 backend/app/core/config.py 的 Settings 类中添加:
    ENCRYPTION_KEY: str = "12345678901234567890123456789012"  # 32-byte AES key
```

- [ ] **Step 2: 创建 Provider 模型**

创建 `backend/app/models/provider.py`:

```python
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Provider(Base):
    __tablename__ = "providers"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    base_url: Mapped[str] = mapped_column(String(500), nullable=False)
    encrypted_api_key: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    models: Mapped[list["LLMModel"]] = relationship(
        "LLMModel", back_populates="provider", cascade="all, delete-orphan"
    )
```

- [ ] **Step 3: 创建 LLMModel 模型**

创建 `backend/app/models/llm_model.py`:

```python
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class LLMModel(Base):
    __tablename__ = "llm_models"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    provider_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("providers.id", ondelete="CASCADE"), nullable=False
    )
    model_id: Mapped[str] = mapped_column(String(200), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    extra_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    provider: Mapped["Provider"] = relationship("Provider", back_populates="models")

    __table_args__ = (
        # UNIQUE constraint on (provider_id, model_id) will be added via Alembic
    )
```

- [ ] **Step 4: 创建 Setting 模型**

创建 `backend/app/models/setting.py`:

```python
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Setting(Base):
    __tablename__ = "settings"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
```

- [ ] **Step 5: 更新 models/__init__.py 导出所有模型**

```python
from app.models.base import Base  # noqa: F401
from app.models.llm_model import LLMModel  # noqa: F401
from app.models.provider import Provider  # noqa: F401
from app.models.setting import Setting  # noqa: F401
from app.models.user import User  # noqa: F401
```

- [ ] **Step 6: 更新 alembic/env.py 导入新模型**

在 `backend/alembic/env.py` 中，将 `from app.models.user import User` 替换为:

```python
from app.models import Provider, LLMModel, Setting, User  # noqa: F401
```

- [ ] **Step 7: 生成 Alembic 迁移**

```bash
cd backend && uv run alembic revision --autogenerate -m "add providers llm_models settings tables"
```

检查生成的迁移文件确保包含:
- 创建 `providers` 表
- 创建 `llm_models` 表（含 `provider_id` 外键和 UNIQUE 约束）
- 创建 `settings` 表
- 保留 `users` 表（如 Alembic 认为需要创建则保留）

- [ ] **Step 8: 运行迁移**

```bash
cd backend && uv run alembic upgrade head
```

Expected: 迁移成功，无报错。

- [ ] **Step 9: 写一个简单测试验证模型可创建**

创建 `backend/tests/test_models.py`:

```python
from app.models.llm_model import LLMModel
from app.models.provider import Provider
from app.models.setting import Setting


def test_provider_model_has_tablename():
    assert Provider.__tablename__ == "providers"


def test_llm_model_has_tablename():
    assert LLMModel.__tablename__ == "llm_models"


def test_setting_model_has_tablename():
    assert Setting.__tablename__ == "settings"
```

```bash
cd backend && uv run pytest tests/test_models.py -v
```

Expected: 3 tests PASS

- [ ] **Step 10: Commit**

```bash
git add backend/app/models/ backend/app/core/config.py backend/alembic/ backend/tests/test_models.py
git commit -m "feat(backend): add Provider, LLMModel, Setting ORM models and migration"
```

---

## Task 2: Pydantic Schemas

**Files:**
- Create: `backend/app/schemas/provider.py`
- Create: `backend/app/schemas/llm_model.py`
- Create: `backend/app/schemas/setting.py`
- Test: `backend/tests/test_schemas.py`

- [ ] **Step 1: 创建 Provider schemas**

创建 `backend/app/schemas/provider.py`:

```python
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class ProviderType(str, Enum):
    OPENAI_COMPATIBLE = "openai_compatible"
    ANTHROPIC_COMPATIBLE = "anthropic_compatible"


class ProviderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    type: ProviderType
    base_url: str = Field(..., min_length=1, max_length=500)
    api_key: str = Field(..., min_length=1)


class ProviderUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    type: ProviderType | None = None
    base_url: str | None = Field(None, min_length=1, max_length=500)
    api_key: str | None = None


class ProviderRead(BaseModel):
    id: str
    name: str
    type: str
    base_url: str
    api_key_masked: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProviderTestRequest(BaseModel):
    model_id: str | None = None
```

- [ ] **Step 2: 创建 LLMModel schemas**

创建 `backend/app/schemas/llm_model.py`:

```python
from datetime import datetime

from pydantic import BaseModel, Field


class ModelCreate(BaseModel):
    provider_id: str = Field(..., min_length=1)
    model_id: str = Field(..., min_length=1, max_length=200)
    display_name: str | None = Field(None, max_length=200)
    extra_config: dict | None = None


class ModelUpdate(BaseModel):
    model_id: str | None = Field(None, min_length=1, max_length=200)
    display_name: str | None = Field(None, max_length=200)
    extra_config: dict | None = None


class ModelRead(BaseModel):
    id: str
    provider_id: str
    model_id: str
    display_name: str | None
    is_enabled: bool
    extra_config: dict | None
    provider_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ModelToggleResponse(BaseModel):
    id: str
    is_enabled: bool
```

- [ ] **Step 3: 创建 Setting schemas**

创建 `backend/app/schemas/setting.py`:

```python
from datetime import datetime

from pydantic import BaseModel, Field


class SettingRead(BaseModel):
    id: str
    key: str
    value: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class SettingUpdate(BaseModel):
    value: str = Field(..., min_length=1)
```

- [ ] **Step 4: 写 Schema 测试**

创建 `backend/tests/test_schemas.py`:

```python
from app.schemas.provider import ProviderCreate, ProviderType, ProviderUpdate
from app.schemas.llm_model import ModelCreate, ModelUpdate
from app.schemas.setting import SettingUpdate


def test_provider_create_schema():
    p = ProviderCreate(
        name="OpenAI",
        type=ProviderType.OPENAI_COMPATIBLE,
        base_url="https://api.openai.com",
        api_key="sk-test-key",
    )
    assert p.name == "OpenAI"
    assert p.type == ProviderType.OPENAI_COMPATIBLE


def test_provider_update_schema_all_optional():
    p = ProviderUpdate()
    assert p.name is None
    assert p.type is None
    assert p.base_url is None
    assert p.api_key is None


def test_model_create_schema():
    m = ModelCreate(provider_id="abc", model_id="gpt-4o")
    assert m.display_name is None
    assert m.extra_config is None


def test_setting_update_schema():
    s = SettingUpdate(value="model-123")
    assert s.value == "model-123"
```

```bash
cd backend && uv run pytest tests/test_schemas.py -v
```

Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/ backend/tests/test_schemas.py
git commit -m "feat(backend): add Pydantic schemas for Provider, Model, Setting"
```

---

## Task 3: Auth 依赖注入 + Auth 端点

**Files:**
- Create: `backend/app/api/deps.py`
- Create: `backend/app/api/endpoints/auth.py`
- Modify: `backend/app/api/router.py`
- Modify: `backend/app/schemas/user.py`（添加 UserLogin）
- Test: `backend/tests/conftest.py`
- Test: `backend/tests/test_auth.py`

- [ ] **Step 1: 创建认证依赖注入**

创建 `backend/app/api/deps.py`:

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.services.auth import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_PREFIX}/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


def require_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser privileges required",
        )
    return current_user
```

- [ ] **Step 2: 添加 UserLogin schema**

在 `backend/app/schemas/user.py` 末尾追加:

```python
class UserLogin(BaseModel):
    username: str
    password: str
```

- [ ] **Step 3: 创建 Auth 端点**

创建 `backend/app/api/endpoints/auth.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.user import Token, UserCreate, UserRead, UserLogin
from app.services.auth import (
    create_access_token,
    get_password_hash,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)) -> User:
    existing = db.query(User).filter(User.username == user_in.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already registered",
        )
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)) -> dict:
    user = db.query(User).filter(User.username == user_in.username).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )
    access_token = create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
```

- [ ] **Step 4: 注册 Auth 路由**

修改 `backend/app/api/router.py`:

```python
from fastapi import APIRouter

from app.api.endpoints import auth, health

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
```

- [ ] **Step 5: 创建测试 conftest.py**

创建 `backend/tests/conftest.py`:

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.session import get_db
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
    from app.db.session import get_db as _get_db

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
```

- [ ] **Step 6: 写 Auth 测试**

创建 `backend/tests/test_auth.py`:

```python
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
```

- [ ] **Step 7: 运行 Auth 测试**

```bash
cd backend && uv run pytest tests/test_auth.py -v
```

Expected: 6 tests PASS

- [ ] **Step 8: Commit**

```bash
git add backend/app/api/deps.py backend/app/api/endpoints/auth.py backend/app/api/router.py backend/app/schemas/user.py backend/tests/conftest.py backend/tests/test_auth.py
git commit -m "feat(backend): add auth endpoints and dependency injection"
```

---

## Task 4: Provider Service + Endpoints

**Files:**
- Create: `backend/app/services/provider.py`
- Create: `backend/app/api/endpoints/provider.py`
- Modify: `backend/app/api/router.py`
- Test: `backend/tests/test_provider.py`

- [ ] **Step 1: 创建 Provider Service**

创建 `backend/app/services/provider.py`:

```python
import time
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.models.llm_model import LLMModel
from app.models.provider import Provider
from app.schemas.provider import ProviderCreate, ProviderType, ProviderUpdate
from shared.utils.crypto import decrypt_api_key, encrypt_api_key, mask_api_key


def _mask_key(encrypted_key: str) -> str:
    decrypted = decrypt_api_key(encrypted_key)
    if not decrypted:
        return "***"
    return mask_api_key(decrypted)


def list_providers(db: Session) -> list[Provider]:
    return db.query(Provider).order_by(Provider.created_at.desc()).all()


def get_provider(db: Session, provider_id: str) -> Optional[Provider]:
    return db.query(Provider).filter(Provider.id == provider_id).first()


def create_provider(db: Session, data: ProviderCreate) -> Provider:
    provider = Provider(
        name=data.name,
        type=data.type.value,
        base_url=data.base_url.rstrip("/"),
        encrypted_api_key=encrypt_api_key(data.api_key),
    )
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return provider


def update_provider(
    db: Session, provider: Provider, data: ProviderUpdate
) -> Provider:
    update_data = data.model_dump(exclude_unset=True)
    if "type" in update_data and update_data["type"] is not None:
        update_data["type"] = update_data["type"].value
    if "api_key" in update_data:
        raw_key = update_data.pop("api_key")
        if raw_key and raw_key != mask_api_key(raw_key):
            provider.encrypted_api_key = encrypt_api_key(raw_key)
    if "base_url" in update_data and update_data["base_url"]:
        update_data["base_url"] = update_data["base_url"].rstrip("/")
    for field, value in update_data.items():
        setattr(provider, field, value)
    db.commit()
    db.refresh(provider)
    return provider


def delete_provider(db: Session, provider: Provider) -> None:
    db.delete(provider)
    db.commit()


def fetch_models(db: Session, provider: Provider) -> list[LLMModel]:
    decrypted_key = decrypt_api_key(provider.encrypted_api_key)
    if not decrypted_key:
        raise ValueError("Failed to decrypt API key")

    base_url = provider.base_url.rstrip("/")
    headers = {}

    if provider.type == ProviderType.OPENAI_COMPATIBLE.value:
        headers["Authorization"] = f"Bearer {decrypted_key}"
    else:
        headers["x-api-key"] = decrypted_key
        headers["anthropic-version"] = "2023-06-01"

    with httpx.Client(timeout=30.0) as client:
        resp = client.get(f"{base_url}/v1/models", headers=headers)
        resp.raise_for_status()

    remote_ids = [m["id"] for m in resp.json().get("data", [])]

    existing_ids = {
        m.model_id for m in db.query(LLMModel).filter(LLMModel.provider_id == provider.id).all()
    }

    new_models = []
    for mid in remote_ids:
        if mid not in existing_ids:
            model = LLMModel(provider_id=provider.id, model_id=mid, is_enabled=False)
            db.add(model)
            new_models.append(model)

    db.commit()
    for m in new_models:
        db.refresh(m)
    return new_models


def test_provider(
    db: Session, provider: Provider, model_id: Optional[str] = None
) -> dict:
    decrypted_key = decrypt_api_key(provider.encrypted_api_key)
    if not decrypted_key:
        return {"success": False, "latency_ms": 0, "error": "Failed to decrypt API key"}

    # Find a model to test with
    if not model_id:
        model = (
            db.query(LLMModel)
            .filter(LLMModel.provider_id == provider.id)
            .first()
        )
        if not model:
            return {"success": False, "latency_ms": 0, "error": "No models available for testing"}
        model_id = model.model_id

    base_url = provider.base_url.rstrip("/")
    start = time.monotonic()

    try:
        with httpx.Client(timeout=30.0) as client:
            if provider.type == ProviderType.OPENAI_COMPATIBLE.value:
                resp = client.post(
                    f"{base_url}/v1/chat/completions",
                    headers={"Authorization": f"Bearer {decrypted_key}"},
                    json={
                        "model": model_id,
                        "messages": [{"role": "user", "content": "Hi"}],
                        "max_tokens": 5,
                    },
                )
            else:
                resp = client.post(
                    f"{base_url}/v1/messages",
                    headers={
                        "x-api-key": decrypted_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": model_id,
                        "messages": [{"role": "user", "content": "Hi"}],
                        "max_tokens": 5,
                    },
                )
            resp.raise_for_status()
        latency_ms = int((time.monotonic() - start) * 1000)
        return {"success": True, "latency_ms": latency_ms, "error": None}
    except Exception as e:
        latency_ms = int((time.monotonic() - start) * 1000)
        return {"success": False, "latency_ms": latency_ms, "error": str(e)}
```

- [ ] **Step 2: 创建 Provider 端点**

创建 `backend/app/api/endpoints/provider.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_superuser
from app.db.session import get_db
from app.models.user import User
from app.schemas.provider import ProviderCreate, ProviderRead, ProviderTestRequest, ProviderUpdate
from app.services.provider import (
    create_provider,
    delete_provider,
    fetch_models,
    get_provider,
    list_providers,
    test_provider,
    update_provider,
    _mask_key,
)

router = APIRouter(prefix="/providers", tags=["providers"])


def _to_read(p) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "type": p.type,
        "base_url": p.base_url,
        "api_key_masked": _mask_key(p.encrypted_api_key),
        "is_active": p.is_active,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
    }


@router.get("", response_model=list[ProviderRead])
def list_all_providers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    providers = list_providers(db)
    return [_to_read(p) for p in providers]


@router.post("", response_model=ProviderRead, status_code=status.HTTP_201_CREATED)
def create_new_provider(
    data: ProviderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    provider = create_provider(db, data)
    return _to_read(provider)


@router.put("/{provider_id}", response_model=ProviderRead)
def update_existing_provider(
    provider_id: str,
    data: ProviderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    provider = get_provider(db, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    provider = update_provider(db, provider, data)
    return _to_read(provider)


@router.delete("/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_provider(
    provider_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    provider = get_provider(db, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    delete_provider(db, provider)


@router.post("/{provider_id}/fetch-models")
def fetch_provider_models(
    provider_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    provider = get_provider(db, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    try:
        new_models = fetch_models(db, provider)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch models: {str(e)}",
        )
    return {
        "fetched": len(new_models),
        "models": [{"id": m.id, "model_id": m.model_id} for m in new_models],
    }


@router.post("/{provider_id}/test")
def test_provider_connection(
    provider_id: str,
    body: ProviderTestRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    provider = get_provider(db, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    model_id = body.model_id if body else None
    result = test_provider(db, provider, model_id)
    return result
```

- [ ] **Step 3: 注册 Provider 路由**

在 `backend/app/api/router.py` 中添加导入和注册:

```python
from fastapi import APIRouter

from app.api.endpoints import auth, health, provider

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(provider.router)
```

- [ ] **Step 4: 写 Provider 测试**

创建 `backend/tests/test_provider.py`:

```python
from unittest.mock import patch, MagicMock


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

        resp = client.delete(
            f"/api/providers/{provider_id}", headers=admin_user
        )
        assert resp.status_code == 204

        # Verify deleted
        list_resp = client.get("/api/providers", headers=admin_user)
        assert all(p["id"] != provider_id for p in list_resp.json())


class TestProviderFetchModels:
    @patch("app.services.provider.httpx.Client")
    def test_fetch_models_success(self, mock_client_cls, admin_user, client):
        # Create provider first
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

        # Mock httpx client
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

        # Add a model for testing
        from app.tests.conftest import TestSessionLocal
        from app.models.llm_model import LLMModel

        db = TestSessionLocal()
        model = LLMModel(provider_id=provider_id, model_id="gpt-4o")
        db.add(model)
        db.commit()
        db.close()

        # Mock httpx client for test
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
```

- [ ] **Step 5: 运行 Provider 测试**

```bash
cd backend && uv run pytest tests/test_provider.py -v
```

Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/provider.py backend/app/api/endpoints/provider.py backend/app/api/router.py backend/tests/test_provider.py
git commit -m "feat(backend): add Provider CRUD service and endpoints with fetch/test"
```

---

## Task 5: LLMModel Service + Endpoints

**Files:**
- Create: `backend/app/services/llm_model.py`
- Create: `backend/app/api/endpoints/llm_model.py`
- Modify: `backend/app/api/router.py`
- Test: `backend/tests/test_llm_model.py`

- [ ] **Step 1: 创建 LLMModel Service**

创建 `backend/app/services/llm_model.py`:

```python
from typing import Optional

from sqlalchemy.orm import Session

from app.models.llm_model import LLMModel
from app.models.setting import Setting
from app.schemas.llm_model import ModelCreate, ModelUpdate


def list_enabled_models(db: Session) -> list[LLMModel]:
    return (
        db.query(LLMModel)
        .filter(LLMModel.is_enabled == True)
        .order_by(LLMModel.created_at.desc())
        .all()
    )


def list_all_models(db: Session) -> list[LLMModel]:
    return db.query(LLMModel).order_by(LLMModel.created_at.desc()).all()


def get_model(db: Session, model_id: str) -> Optional[LLMModel]:
    return db.query(LLMModel).filter(LLMModel.id == model_id).first()


def create_model(db: Session, data: ModelCreate) -> LLMModel:
    model = LLMModel(
        provider_id=data.provider_id,
        model_id=data.model_id,
        display_name=data.display_name,
        extra_config=data.extra_config,
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    return model


def update_model(db: Session, model: LLMModel, data: ModelUpdate) -> LLMModel:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(model, field, value)
    db.commit()
    db.refresh(model)
    return model


def delete_model(db: Session, model: LLMModel) -> None:
    # Clear default if this model is the default
    setting = db.query(Setting).filter(Setting.key == "default_model_id").first()
    if setting and setting.value == model.id:
        setting.value = ""
    db.delete(model)
    db.commit()


def toggle_model(db: Session, model: LLMModel) -> LLMModel:
    model.is_enabled = not model.is_enabled
    # If disabling, clear default if this was it
    if not model.is_enabled:
        setting = db.query(Setting).filter(Setting.key == "default_model_id").first()
        if setting and setting.value == model.id:
            setting.value = ""
    db.commit()
    db.refresh(model)
    return model
```

- [ ] **Step 2: 创建 LLMModel 端点**

创建 `backend/app/api/endpoints/llm_model.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_superuser
from app.db.session import get_db
from app.models.llm_model import LLMModel
from app.models.user import User
from app.schemas.llm_model import ModelCreate, ModelRead, ModelToggleResponse, ModelUpdate
from app.services.llm_model import (
    create_model,
    delete_model,
    get_model,
    list_all_models,
    list_enabled_models,
    toggle_model,
    update_model,
)

router = APIRouter(prefix="/models", tags=["models"])


def _to_read(m: LLMModel) -> dict:
    return {
        "id": m.id,
        "provider_id": m.provider_id,
        "model_id": m.model_id,
        "display_name": m.display_name,
        "is_enabled": m.is_enabled,
        "extra_config": m.extra_config,
        "provider_name": m.provider.name if m.provider else None,
        "created_at": m.created_at,
        "updated_at": m.updated_at,
    }


@router.get("", response_model=list[ModelRead])
def list_enabled(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    models = list_enabled_models(db)
    return [_to_read(m) for m in models]


@router.get("/all", response_model=list[ModelRead])
def list_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    models = list_all_models(db)
    return [_to_read(m) for m in models]


@router.post("", response_model=ModelRead, status_code=status.HTTP_201_CREATED)
def create_new_model(
    data: ModelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    model = create_model(db, data)
    return _to_read(model)


@router.put("/{model_id}", response_model=ModelRead)
def update_existing_model(
    model_id: str,
    data: ModelUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    model = get_model(db, model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    model = update_model(db, model, data)
    return _to_read(model)


@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_model(
    model_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    model = get_model(db, model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    delete_model(db, model)


@router.patch("/{model_id}/toggle", response_model=ModelToggleResponse)
def toggle_model_status(
    model_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    model = get_model(db, model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    model = toggle_model(db, model)
    return {"id": model.id, "is_enabled": model.is_enabled}
```

- [ ] **Step 3: 注册 Model 路由**

在 `backend/app/api/router.py` 中添加:

```python
from fastapi import APIRouter

from app.api.endpoints import auth, health, llm_model, provider

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(provider.router)
api_router.include_router(llm_model.router)
```

- [ ] **Step 4: 写 Model 测试**

创建 `backend/tests/test_llm_model.py`:

```python
from app.tests.conftest import TestSessionLocal
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

        resp = client.patch(
            f"/api/models/{model_id}/toggle", headers=admin_user
        )
        assert resp.status_code == 200
        assert resp.json()["is_enabled"] is True

        # Toggle back
        resp = client.patch(
            f"/api/models/{model_id}/toggle", headers=admin_user
        )
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
```

- [ ] **Step 5: 运行 Model 测试**

```bash
cd backend && uv run pytest tests/test_llm_model.py -v
```

Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/llm_model.py backend/app/api/endpoints/llm_model.py backend/app/api/router.py backend/tests/test_llm_model.py
git commit -m "feat(backend): add LLMModel CRUD service and endpoints with toggle"
```

---

## Task 6: Setting Service + Endpoints

**Files:**
- Create: `backend/app/services/setting.py`
- Create: `backend/app/api/endpoints/setting.py`
- Modify: `backend/app/api/router.py`
- Test: `backend/tests/test_setting.py`

- [ ] **Step 1: 创建 Setting Service**

创建 `backend/app/services/setting.py`:

```python
from sqlalchemy.orm import Session

from app.models.setting import Setting


def list_settings(db: Session) -> list[Setting]:
    return db.query(Setting).all()


def get_setting(db: Session, key: str) -> Setting | None:
    return db.query(Setting).filter(Setting.key == key).first()


def upsert_setting(db: Session, key: str, value: str) -> Setting:
    setting = get_setting(db, key)
    if setting:
        setting.value = value
    else:
        setting = Setting(key=key, value=value)
        db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting
```

- [ ] **Step 2: 创建 Setting 端点**

创建 `backend/app/api/endpoints/setting.py`:

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_superuser
from app.db.session import get_db
from app.models.user import User
from app.schemas.setting import SettingRead, SettingUpdate
from app.services.setting import list_settings, upsert_setting

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=list[SettingRead])
def get_all_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_settings(db)


@router.put("/{key}", response_model=SettingRead)
def update_setting(
    key: str,
    data: SettingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superuser),
):
    setting = upsert_setting(db, key, data.value)
    return setting
```

- [ ] **Step 3: 注册 Setting 路由**

更新 `backend/app/api/router.py`:

```python
from fastapi import APIRouter

from app.api.endpoints import auth, health, llm_model, provider, setting

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(provider.router)
api_router.include_router(llm_model.router)
api_router.include_router(setting.router)
```

- [ ] **Step 4: 写 Setting 测试**

创建 `backend/tests/test_setting.py`:

```python
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
        # Create
        client.put(
            "/api/settings/default_model_id",
            headers=admin_user,
            json={"value": "model-1"},
        )
        # Update
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
```

- [ ] **Step 5: 运行 Setting 测试**

```bash
cd backend && uv run pytest tests/test_setting.py -v
```

Expected: All tests PASS

- [ ] **Step 6: 运行所有后端测试**

```bash
cd backend && uv run pytest tests/ -v
```

Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/setting.py backend/app/api/endpoints/setting.py backend/app/api/router.py backend/tests/test_setting.py
git commit -m "feat(backend): add Setting CRUD service and endpoints"
```

---

## Task 7: 前端 — 安装 shadcn/ui 组件 + 扩展 API 客户端

**Files:**
- Modify: `frontend/src/apis/client.ts`
- Create: `frontend/src/components/ui/button.tsx`（通过 CLI 生成）
- Create: `frontend/src/components/ui/input.tsx`
- Create: `frontend/src/components/ui/dialog.tsx`
- Create: `frontend/src/components/ui/sheet.tsx`
- Create: `frontend/src/components/ui/switch.tsx`
- Create: `frontend/src/components/ui/select.tsx`
- Create: `frontend/src/components/ui/table.tsx`
- Create: `frontend/src/components/ui/tooltip.tsx`
- Create: `frontend/src/components/ui/label.tsx`
- Create: `frontend/src/components/ui/badge.tsx`
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/tailwind.config.js`

- [ ] **Step 1: 扩展 API 客户端添加 PATCH 方法**

在 `frontend/src/apis/client.ts` 中添加 patch 方法:

```typescript
  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }
```

- [ ] **Step 2: 安装必要的 Radix UI 依赖**

```bash
cd frontend && npm install @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-switch @radix-ui/react-tooltip @radix-ui/react-label @radix-ui/react-separator swr
```

- [ ] **Step 3: 使用 shadcn CLI 安装组件**

```bash
cd frontend && npx shadcn@latest add button input dialog sheet switch select table tooltip label badge -y
```

此命令会自动创建 `frontend/src/components/ui/` 下的组件文件并更新 globals.css。

如果 CLI 失败，手动创建每个组件（从 shadcn/ui 官方仓库复制标准模板）。

- [ ] **Step 4: 验证组件安装成功**

```bash
cd frontend && npm run build
```

Expected: 构建成功，无报错。

- [ ] **Step 5: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): install shadcn/ui components and extend API client"
```

---

## Task 8: 前端 — 类型定义 + API 调用模块

**Files:**
- Create: `frontend/src/types/provider.ts`
- Create: `frontend/src/types/model.ts`
- Create: `frontend/src/types/setting.ts`
- Create: `frontend/src/apis/providers.ts`
- Create: `frontend/src/apis/models.ts`
- Create: `frontend/src/apis/settings.ts`

- [ ] **Step 1: 创建 Provider 类型**

创建 `frontend/src/types/provider.ts`:

```typescript
export type ProviderType = 'openai_compatible' | 'anthropic_compatible'

export interface Provider {
  id: string
  name: string
  type: ProviderType
  base_url: string
  api_key_masked: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProviderCreate {
  name: string
  type: ProviderType
  base_url: string
  api_key: string
}

export interface ProviderUpdate {
  name?: string
  type?: ProviderType
  base_url?: string
  api_key?: string
}
```

- [ ] **Step 2: 创建 Model 类型**

创建 `frontend/src/types/model.ts`:

```typescript
export interface LLMModel {
  id: string
  provider_id: string
  model_id: string
  display_name: string | null
  is_enabled: boolean
  extra_config: Record<string, unknown> | null
  provider_name: string | null
  created_at: string
  updated_at: string
}

export interface ModelCreate {
  provider_id: string
  model_id: string
  display_name?: string
  extra_config?: Record<string, unknown>
}

export interface ModelUpdate {
  model_id?: string
  display_name?: string
  extra_config?: Record<string, unknown>
}
```

- [ ] **Step 3: 创建 Setting 类型**

创建 `frontend/src/types/setting.ts`:

```typescript
export interface Setting {
  id: string
  key: string
  value: string
  updated_at: string
}
```

- [ ] **Step 4: 创建 Provider API 模块**

创建 `frontend/src/apis/providers.ts`:

```typescript
import { apiClient } from '@/apis/client'
import type { Provider, ProviderCreate, ProviderUpdate } from '@/types/provider'

export const providersApi = {
  list: () => apiClient.get<Provider[]>('/providers'),

  create: (data: ProviderCreate) =>
    apiClient.post<Provider>('/providers', data),

  update: (id: string, data: ProviderUpdate) =>
    apiClient.put<Provider>(`/providers/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/providers/${id}`),

  fetchModels: (id: string) =>
    apiClient.post<{ fetched: number; models: { id: string; model_id: string }[] }>(
      `/providers/${id}/fetch-models`,
    ),

  test: (id: string, modelId?: string) =>
    apiClient.post<{ success: boolean; latency_ms: number; error: string | null }>(
      `/providers/${id}/test`,
      modelId ? { model_id: modelId } : undefined,
    ),
}
```

- [ ] **Step 5: 创建 Model API 模块**

创建 `frontend/src/apis/models.ts`:

```typescript
import { apiClient } from '@/apis/client'
import type { LLMModel, ModelCreate, ModelUpdate } from '@/types/model'

export const modelsApi = {
  listEnabled: () => apiClient.get<LLMModel[]>('/models'),

  listAll: () => apiClient.get<LLMModel[]>('/models/all'),

  create: (data: ModelCreate) =>
    apiClient.post<LLMModel>('/models', data),

  update: (id: string, data: ModelUpdate) =>
    apiClient.put<LLMModel>(`/models/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/models/${id}`),

  toggle: (id: string) =>
    apiClient.patch<{ id: string; is_enabled: boolean }>(`/models/${id}/toggle`),
}
```

- [ ] **Step 6: 创建 Setting API 模块**

创建 `frontend/src/apis/settings.ts`:

```typescript
import { apiClient } from '@/apis/client'
import type { Setting } from '@/types/setting'

export const settingsApi = {
  list: () => apiClient.get<Setting[]>('/settings'),

  update: (key: string, value: string) =>
    apiClient.put<Setting>(`/settings/${key}`, { value }),
}
```

- [ ] **Step 7: 验证 TypeScript 编译**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 无类型错误。

- [ ] **Step 8: Commit**

```bash
git add frontend/src/types/ frontend/src/apis/
git commit -m "feat(frontend): add type definitions and API modules for providers, models, settings"
```

---

## Task 9: 前端 — 设置面板组件

**Files:**
- Create: `frontend/src/components/settings/settings-panel.tsx`
- Create: `frontend/src/components/settings/general-settings.tsx`
- Create: `frontend/src/components/settings/model-config.tsx`
- Create: `frontend/src/components/settings/provider-form-dialog.tsx`
- Create: `frontend/src/components/settings/model-form-dialog.tsx`
- Create: `frontend/src/components/settings/test-model-dialog.tsx`
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: 创建设置面板主组件**

创建 `frontend/src/components/settings/settings-panel.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { GeneralSettings } from './general-settings'
import { ModelConfig } from './model-config'

type Tab = 'general' | 'models'

export function SettingsPanel() {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('models')

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid="settings-trigger"
          className="fixed right-4 top-4 z-50"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[700px] sm:max-w-[700px] p-0" data-testid="settings-panel">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>设置</SheetTitle>
        </SheetHeader>
        <div className="flex h-[calc(100vh-73px)]">
          {/* Left nav */}
          <nav className="w-40 border-r p-4 flex flex-col gap-1">
            <button
              data-testid="tab-general"
              onClick={() => setActiveTab('general')}
              className={`text-left px-3 py-2 rounded-md text-sm transition-colors ${
                activeTab === 'general'
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:bg-surface'
              }`}
            >
              通用设置
            </button>
            <button
              data-testid="tab-models"
              onClick={() => setActiveTab('models')}
              className={`text-left px-3 py-2 rounded-md text-sm transition-colors ${
                activeTab === 'models'
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:bg-surface'
              }`}
            >
              模型配置
            </button>
          </nav>
          {/* Right content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'general' && <GeneralSettings />}
            {activeTab === 'models' && <ModelConfig />}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: 创建通用设置组件**

创建 `frontend/src/components/settings/general-settings.tsx`:

```tsx
'use client'

import useSWR from 'swr'
import { settingsApi } from '@/apis/settings'
import { modelsApi } from '@/apis/models'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

export function GeneralSettings() {
  const { data: settings } = useSWR('settings', () => settingsApi.list())
  const { data: models, mutate: mutateModels } = useSWR(
    'enabled-models',
    () => modelsApi.listEnabled(),
  )
  const { mutate: mutateSettings } = useSWR('settings', () => settingsApi.list())

  const defaultModel = settings?.find((s) => s.key === 'default_model_id')
  const enabledModels = models ?? []

  const handleDefaultChange = async (value: string) => {
    await settingsApi.update('default_model_id', value)
    mutateSettings()
  }

  return (
    <div className="space-y-6" data-testid="general-settings">
      <div>
        <h3 className="text-base font-medium mb-4">通用设置</h3>
      </div>
      <div className="space-y-2">
        <Label htmlFor="default-model" data-testid="default-model-label">
          默认模型
        </Label>
        <Select
          value={defaultModel?.value || ''}
          onValueChange={handleDefaultChange}
        >
          <SelectTrigger id="default-model" data-testid="default-model-select">
            <SelectValue placeholder="选择默认模型" />
          </SelectTrigger>
          <SelectContent>
            {enabledModels.length === 0 && (
              <div className="px-2 py-1.5 text-sm text-text-muted">
                暂无启用的模型
              </div>
            )}
            {enabledModels.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.display_name || model.model_id}
                {model.provider_name ? ` (${model.provider_name})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-text-muted">
          对话时默认使用的模型。请先在模型配置中启用模型。
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 创建 Provider 表单弹窗**

创建 `frontend/src/components/settings/provider-form-dialog.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { Provider, ProviderCreate, ProviderType } from '@/types/provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Eye, EyeOff } from 'lucide-react'

interface ProviderFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider?: Provider | null
  onSubmit: (data: ProviderCreate) => Promise<void>
}

export function ProviderFormDialog({
  open,
  onOpenChange,
  provider,
  onSubmit,
}: ProviderFormDialogProps) {
  const [name, setName] = useState(provider?.name ?? '')
  const [type, setType] = useState<ProviderType>(
    provider?.type ?? 'openai_compatible',
  )
  const [baseUrl, setBaseUrl] = useState(provider?.base_url ?? '')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)

  const isEdit = !!provider

  const handleSubmit = async () => {
    if (!name || !baseUrl) return
    setLoading(true)
    try {
      await onSubmit({ name, type, base_url: baseUrl, api_key: apiKey })
      onOpenChange(false)
      // Reset form for next open
      if (!isEdit) {
        setName('')
        setBaseUrl('')
        setApiKey('')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="provider-form-dialog">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑 Provider' : '添加 Provider'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="provider-name">名称</Label>
            <Input
              id="provider-name"
              data-testid="provider-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如 OpenAI、DeepSeek"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider-type">类型</Label>
            <Select value={type} onValueChange={(v) => setType(v as ProviderType)}>
              <SelectTrigger id="provider-type" data-testid="provider-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai_compatible">OpenAI 兼容</SelectItem>
                <SelectItem value="anthropic_compatible">Anthropic 兼容</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider-url">Base URL</Label>
            <Input
              id="provider-url"
              data-testid="provider-url-input"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider-key">
              API Key{isEdit && '（留空则不修改）'}
            </Label>
            <div className="relative">
              <Input
                id="provider-key"
                data-testid="provider-key-input"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={isEdit ? '••••••••' : '输入 API Key'}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                data-testid="toggle-key-visibility"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="provider-cancel"
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !name || !baseUrl || (!isEdit && !apiKey)}
            data-testid="provider-submit"
          >
            {loading ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: 创建手动添加模型弹窗**

创建 `frontend/src/components/settings/model-form-dialog.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { ModelCreate } from '@/types/model'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface ModelFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providerId: string
  onSubmit: (data: ModelCreate) => Promise<void>
}

export function ModelFormDialog({
  open,
  onOpenChange,
  providerId,
  onSubmit,
}: ModelFormDialogProps) {
  const [modelId, setModelId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!modelId) return
    setLoading(true)
    try {
      await onSubmit({
        provider_id: providerId,
        model_id: modelId,
        display_name: displayName || undefined,
      })
      onOpenChange(false)
      setModelId('')
      setDisplayName('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="model-form-dialog">
        <DialogHeader>
          <DialogTitle>手动添加模型</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="model-id">Model ID</Label>
            <Input
              id="model-id"
              data-testid="model-id-input"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              placeholder="如 gpt-4o、claude-sonnet-4-20250514"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="display-name">显示名称（可选）</Label>
            <Input
              id="display-name"
              data-testid="display-name-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="如 GPT-4o"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="model-cancel"
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !modelId}
            data-testid="model-submit"
          >
            {loading ? '添加中...' : '添加'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 5: 创建测试模型弹窗**

创建 `frontend/src/components/settings/test-model-dialog.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { LLMModel } from '@/types/model'
import { providersApi } from '@/apis/providers'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface TestModelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providerId: string
  models: LLMModel[]
}

export function TestModelDialog({
  open,
  onOpenChange,
  providerId,
  models,
}: TestModelDialogProps) {
  const [selectedModelId, setSelectedModelId] = useState<string>(
    models[0]?.model_id ?? '',
  )
  const [result, setResult] = useState<{
    success: boolean
    latency_ms: number
    error: string | null
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleTest = async () => {
    if (!selectedModelId) return
    setLoading(true)
    setResult(null)
    try {
      const res = await providersApi.test(providerId, selectedModelId)
      setResult(res)
    } catch {
      setResult({ success: false, latency_ms: 0, error: '请求失败' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="test-model-dialog">
        <DialogHeader>
          <DialogTitle>测试模型连通性</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>选择模型</Label>
            <Select value={selectedModelId} onValueChange={setSelectedModelId}>
              <SelectTrigger data-testid="test-model-select">
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.model_id}>
                    {m.display_name || m.model_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {result && (
            <div
              className={`flex items-center gap-2 p-3 rounded-md text-sm ${
                result.success
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
              data-testid="test-result"
            >
              {result.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span>
                {result.success
                  ? `连接成功 (${result.latency_ms}ms)`
                  : `连接失败: ${result.error}`}
              </span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              setResult(null)
            }}
            data-testid="test-close"
          >
            关闭
          </Button>
          <Button
            onClick={handleTest}
            disabled={loading || !selectedModelId}
            data-testid="test-run"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            测试
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 6: 创建模型配置页（主页面）**

创建 `frontend/src/components/settings/model-config.tsx`:

```tsx
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import type { Provider, ProviderCreate } from '@/types/provider'
import type { LLMModel, ModelCreate } from '@/types/model'
import { providersApi } from '@/apis/providers'
import { modelsApi } from '@/apis/models'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ProviderFormDialog } from './provider-form-dialog'
import { ModelFormDialog } from './model-form-dialog'
import { TestModelDialog } from './test-model-dialog'
import { Plus, RefreshCw, Trash2, FlaskConical, Edit } from 'lucide-react'

export function ModelConfig() {
  const { data: providers, mutate: mutateProviders } = useSWR(
    'providers',
    () => providersApi.list(),
  )
  const { data: allModels, mutate: mutateModels } = useSWR(
    'all-models',
    () => modelsApi.listAll(),
  )

  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [providerDialogOpen, setProviderDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const [modelDialogOpen, setModelDialogOpen] = useState(false)
  const [testDialogOpen, setTestDialogOpen] = useState(false)

  const providerModels = allModels?.filter(
    (m) => m.provider_id === selectedProvider?.id,
  ) ?? []

  // Provider CRUD
  const handleCreateProvider = async (data: ProviderCreate) => {
    await providersApi.create(data)
    mutateProviders()
  }

  const handleUpdateProvider = async (data: ProviderCreate) => {
    if (!editingProvider) return
    await providersApi.update(editingProvider.id, data)
    mutateProviders()
    setEditingProvider(null)
  }

  const handleDeleteProvider = async (id: string) => {
    await providersApi.delete(id)
    mutateProviders()
    mutateModels()
    if (selectedProvider?.id === id) setSelectedProvider(null)
  }

  // Fetch models
  const handleFetchModels = async () => {
    if (!selectedProvider) return
    await providersApi.fetchModels(selectedProvider.id)
    mutateModels()
  }

  // Model CRUD
  const handleCreateModel = async (data: ModelCreate) => {
    await modelsApi.create(data)
    mutateModels()
  }

  const handleToggleModel = async (model: LLMModel) => {
    await modelsApi.toggle(model.id)
    mutateModels()
  }

  const handleDeleteModel = async (id: string) => {
    await modelsApi.delete(id)
    mutateModels()
  }

  return (
    <div className="space-y-6" data-testid="model-config">
      {/* Provider section */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium">Provider 列表</h3>
        <Button
          size="sm"
          onClick={() => {
            setEditingProvider(null)
            setProviderDialogOpen(true)
          }}
          data-testid="add-provider-button"
        >
          <Plus className="h-4 w-4 mr-1" />
          添加 Provider
        </Button>
      </div>

      {(!providers || providers.length === 0) && (
        <p className="text-sm text-text-muted py-4 text-center">
          暂无 Provider，点击上方按钮添加
        </p>
      )}

      <div className="space-y-2">
        {providers?.map((p) => (
          <div
            key={p.id}
            onClick={() => setSelectedProvider(p)}
            className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors ${
              selectedProvider?.id === p.id
                ? 'border-primary bg-surface'
                : 'border-border hover:bg-surface'
            }`}
            data-testid={`provider-item-${p.id}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{p.name}</span>
              <Badge variant="secondary" className="text-xs">
                {p.type === 'openai_compatible' ? 'OpenAI' : 'Anthropic'}
              </Badge>
              <span className="text-xs text-text-muted">{p.base_url}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingProvider(p)
                  setProviderDialogOpen(true)
                }}
                data-testid={`edit-provider-${p.id}`}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-600"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteProvider(p.id)
                }}
                data-testid={`delete-provider-${p.id}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Models section */}
      {selectedProvider && (
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              {selectedProvider.name} 的模型
            </h4>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleFetchModels}
                data-testid="fetch-models-button"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Fetch 模型
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModelDialogOpen(true)}
                data-testid="add-model-button"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                手动添加
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTestDialogOpen(true)}
                data-testid="test-connection-button"
              >
                <FlaskConical className="h-3.5 w-3.5 mr-1" />
                测试
              </Button>
            </div>
          </div>

          {providerModels.length === 0 && (
            <p className="text-sm text-text-muted py-2 text-center">
              暂无模型，点击 Fetch 拉取或手动添加
            </p>
          )}

          <div className="space-y-1">
            {providerModels.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-2.5 rounded-md border border-border"
                data-testid={`model-item-${m.id}`}
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={m.is_enabled}
                    onCheckedChange={() => handleToggleModel(m)}
                    data-testid={`toggle-model-${m.id}`}
                  />
                  <div>
                    <span className="text-sm">
                      {m.display_name || m.model_id}
                    </span>
                    {m.display_name && (
                      <span className="text-xs text-text-muted ml-2">
                        {m.model_id}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-text-muted hover:text-red-500"
                  onClick={() => handleDeleteModel(m.id)}
                  data-testid={`delete-model-${m.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ProviderFormDialog
        open={providerDialogOpen}
        onOpenChange={setProviderDialogOpen}
        provider={editingProvider}
        onSubmit={editingProvider ? handleUpdateProvider : handleCreateProvider}
      />
      <ModelFormDialog
        open={modelDialogOpen}
        onOpenChange={setModelDialogOpen}
        providerId={selectedProvider?.id ?? ''}
        onSubmit={handleCreateModel}
      />
      <TestModelDialog
        open={testDialogOpen}
        onOpenChange={setTestDialogOpen}
        providerId={selectedProvider?.id ?? ''}
        models={providerModels}
      />
    </div>
  )
}
```

- [ ] **Step 7: 更新首页添加设置按钮**

修改 `frontend/src/app/page.tsx`:

```tsx
import { SettingsPanel } from '@/components/settings/settings-panel'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-base text-text-primary">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-12">
        <p className="text-sm text-text-secondary">Agent Template</p>
        <h1 className="mt-3 text-xl font-semibold">全栈 AI 应用模板</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-text-secondary">
          工程底座已就绪。后续模块会在这里接入模型供应商、提示词模板、智能体配置和多智能体编排。
        </p>
      </section>
      <SettingsPanel />
    </main>
  )
}
```

- [ ] **Step 8: 验证前端构建**

```bash
cd frontend && npm run build
```

Expected: 构建成功。

- [ ] **Step 9: Commit**

```bash
git add frontend/src/
git commit -m "feat(frontend): add settings panel with provider/model management UI"
```

---

## Task 10: 集成测试 + 清理

**Files:**
- Test: `backend/tests/test_integration.py`
- Modify: `backend/app/api/router.py`（最终状态确认）

- [ ] **Step 1: 写集成测试（完整流程）**

创建 `backend/tests/test_integration.py`:

```python
"""Integration test: create provider → fetch models → toggle → set default."""


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
        resp = client.patch(
            f"/api/models/{model_id}/toggle", headers=admin_user
        )
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
        resp = client.patch(
            f"/api/models/{model_id}/toggle", headers=admin_user
        )
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
        resp = client.delete(
            f"/api/providers/{provider_id}", headers=admin_user
        )
        assert resp.status_code == 204
```

- [ ] **Step 2: 运行所有后端测试**

```bash
cd backend && uv run pytest tests/ -v --tb=short
```

Expected: All tests PASS

- [ ] **Step 3: 验证前端构建**

```bash
cd frontend && npm run build
```

Expected: 构建成功。

- [ ] **Step 4: 代码格式化**

```bash
cd backend && uv run black . && uv run isort .
cd frontend && npm run format && npm run lint
```

- [ ] **Step 5: Commit**

```bash
git add backend/tests/test_integration.py
git commit -m "test(backend): add integration test for provider-model-settings flow"
```

---

## Self-Review Checklist

- [x] **Spec coverage**: 数据库表（providers, llm_models, settings）→ Task 1; Pydantic schemas → Task 2; Auth 端点 → Task 3; Provider CRUD + fetch + test → Task 4; Model CRUD + toggle → Task 5; Settings CRUD → Task 6; 前端 UI → Tasks 7-9; 集成测试 → Task 10
- [x] **Placeholder scan**: 无 TBD/TODO/placeholder
- [x] **Type consistency**: 所有文件名、类名、函数签名在定义处和使用处一致
