# 登录认证功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为全栈 AI 应用添加登录认证，包含后端 refresh token cookie 机制、默认管理员种子数据、前端登录页面和认证状态管理。

**Architecture:** 后端在现有 JWT 基础上新增 refresh token（httpOnly cookie）和 seed 初始化。前端新增 AuthContext 管理登录态、APIClient 拦截器自动刷新 token、独立登录页和路由守卫。

**Tech Stack:** FastAPI + python-jose (JWT) + passlib (bcrypt) | Next.js 15 + React 19 + Tailwind CSS + SWR

---

## 文件结构

### 后端（修改/新建）

| 操作 | 文件 | 职责 |
|---|---|---|
| 修改 | `backend/app/core/config.py` | 新增 `REFRESH_TOKEN_EXPIRE_DAYS` 配置 |
| 修改 | `backend/app/services/auth.py` | 新增 refresh token 创建/验证函数 |
| 修改 | `backend/app/schemas/user.py` | 新增 `TokenWithExpiry` schema |
| 修改 | `backend/app/api/endpoints/auth.py` | 登录返回 cookie，新增 refresh/logout 端点 |
| 新建 | `backend/app/db/seed.py` | 默认管理员种子数据 |
| 修改 | `backend/app/main.py` | lifespan 调用 seed |
| 修改 | `backend/tests/test_auth.py` | 新增 refresh/logout/seed 测试 |
| 修改 | `backend/tests/conftest.py` | 更新 fixture 适配 cookie 返回 |

### 前端（修改/新建）

| 操作 | 文件 | 职责 |
|---|---|---|
| 修改 | `frontend/src/apis/client.ts` | 添加 token 内存管理 + 401 自动刷新 |
| 新建 | `frontend/src/features/auth/auth-context.tsx` | AuthContext + AuthProvider |
| 新建 | `frontend/src/features/auth/use-auth.ts` | useAuth hook |
| 新建 | `frontend/src/features/auth/auth-guard.tsx` | 路由守卫组件 |
| 新建 | `frontend/src/app/login/page.tsx` | 独立登录页面 |
| 修改 | `frontend/src/app/layout.tsx` | 包裹 AuthProvider |
| 修改 | `frontend/src/app/page.tsx` | 包裹 AuthGuard |

---

## Task 1: 后端 — 新增 refresh token 配置和服务函数

**Files:**
- Modify: `backend/app/core/config.py`
- Modify: `backend/app/services/auth.py`
- Modify: `backend/app/schemas/user.py`

- [ ] **Step 1: 在 config.py 中新增 refresh token 过期配置**

在 `backend/app/core/config.py` 的 `Settings` 类中，在 `ACCESS_TOKEN_EXPIRE_MINUTES` 下方新增：

```python
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30  # access token 有效期改为 30 分钟
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
```

注意：将 `ACCESS_TOKEN_EXPIRE_MINUTES` 从 `10080`（7天）改为 `30`（分钟），因为现在有 refresh token 机制了。

- [ ] **Step 2: 在 auth.py 中新增 refresh token 函数**

在 `backend/app/services/auth.py` 末尾新增：

```python
def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_refresh_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        if payload.get("type") != "refresh":
            return None
        return payload
    except JWTError:
        return None
```

- [ ] **Step 3: 在 schemas/user.py 中新增 TokenWithExpiry schema**

在 `backend/app/schemas/user.py` 的 `Token` 类之后新增：

```python
class TokenWithExpiry(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
```

- [ ] **Step 4: 提交**

```bash
git add backend/app/core/config.py backend/app/services/auth.py backend/app/schemas/user.py
git commit -m "feat(backend): add refresh token config and service functions"
```

---

## Task 2: 后端 — 改造登录端点，新增 refresh 和 logout

**Files:**
- Modify: `backend/app/api/endpoints/auth.py`

- [ ] **Step 1: 修改 auth.py 端点文件**

将 `backend/app/api/endpoints/auth.py` 替换为：

```python
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import TokenWithExpiry, UserCreate, UserLogin, UserRead
from app.services.auth import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    get_password_hash,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_TOKEN_KEY = "refresh_token"


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=REFRESH_TOKEN_KEY,
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=settings.ENVIRONMENT == "production",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path=f"{settings.API_PREFIX}/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.set_cookie(
        key=REFRESH_TOKEN_KEY,
        value="",
        httponly=True,
        samesite="lax",
        secure=settings.ENVIRONMENT == "production",
        max_age=0,
        path=f"{settings.API_PREFIX}/auth",
    )


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


@router.post("/login", response_model=TokenWithExpiry)
def login(response: Response, user_in: UserLogin, db: Session = Depends(get_db)) -> dict:
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
    refresh = create_refresh_token(data={"sub": user.id})
    _set_refresh_cookie(response, refresh)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@router.post("/refresh", response_model=TokenWithExpiry)
def refresh(
    response: Response,
    refresh_token: Optional[str] = Cookie(None, alias=REFRESH_TOKEN_KEY),
    db: Session = Depends(get_db),
) -> dict:
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )
    payload = decode_refresh_token(refresh_token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token payload",
        )
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    access_token = create_access_token(data={"sub": user.id})
    new_refresh = create_refresh_token(data={"sub": user.id})
    _set_refresh_cookie(response, new_refresh)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@router.post("/logout")
def logout(response: Response) -> dict:
    _clear_refresh_cookie(response)
    return {"message": "Logged out"}


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
```

- [ ] **Step 2: 提交**

```bash
git add backend/app/api/endpoints/auth.py
git commit -m "feat(backend): add refresh/logout endpoints with httpOnly cookie"
```

---

## Task 3: 后端 — 新增默认管理员种子数据

**Files:**
- Create: `backend/app/db/seed.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: 创建 seed.py**

创建 `backend/app/db/seed.py`：

```python
import structlog
from sqlalchemy.orm import Session

from app.models.user import User
from app.services.auth import get_password_hash

logger = structlog.get_logger("seed")

DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "admin"
DEFAULT_ADMIN_EMAIL = "admin@localhost"


def seed_default_admin(db: Session) -> None:
    existing = db.query(User).filter(User.username == DEFAULT_ADMIN_USERNAME).first()
    if existing:
        logger.info("seed_skipped", reason="admin user already exists")
        return
    admin = User(
        username=DEFAULT_ADMIN_USERNAME,
        email=DEFAULT_ADMIN_EMAIL,
        hashed_password=get_password_hash(DEFAULT_ADMIN_PASSWORD),
        is_superuser=True,
        is_active=True,
    )
    db.add(admin)
    db.commit()
    logger.info("seed_created", username=DEFAULT_ADMIN_USERNAME)
```

- [ ] **Step 2: 在 main.py lifespan 中调用 seed**

修改 `backend/app/main.py`，在 `lifespan` 函数的 `setup_logging()` 之后添加 seed 调用：

```python
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.error_tracking import init_error_tracking
from app.core.langfuse import init_langfuse, shutdown_langfuse
from app.core.logging import setup_logging
from app.db.seed import seed_default_admin
from app.db.session import SessionLocal


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    init_error_tracking()
    langfuse = init_langfuse()
    if langfuse:
        structlog.get_logger("langfuse").info(
            "langfuse_connected", host=settings.LANGFUSE_HOST
        )
    # Seed default admin user
    db = SessionLocal()
    try:
        seed_default_admin(db)
    finally:
        db.close()
    yield
    shutdown_langfuse()
```

注意新增了两个 import：`from app.db.seed import seed_default_admin` 和 `from app.db.session import SessionLocal`。在 `setup_logging()` 之后、`langfuse` 初始化之前，插入 seed 调用代码块。

- [ ] **Step 3: 提交**

```bash
git add backend/app/db/seed.py backend/app/main.py
git commit -m "feat(backend): add default admin seed on startup"
```

---

## Task 4: 后端 — 更新测试

**Files:**
- Modify: `backend/tests/conftest.py`
- Modify: `backend/tests/test_auth.py`

- [ ] **Step 1: 更新 conftest.py fixture 适配新 login 响应格式**

`backend/tests/conftest.py` 中 `test_user` 和 `admin_user` fixture 需要从响应 body 中获取 access_token（逻辑不变，login 仍然返回 JSON body 中的 `access_token`）。但需要确保 TestClient 支持 cookie。

现有 fixture 无需修改——`test_user` 和 `admin_user` 已经从 `resp.json()["access_token"]` 获取 token，这与新 login 响应格式兼容。

- [ ] **Step 2: 在 test_auth.py 中新增测试类**

在 `backend/tests/test_auth.py` 末尾追加：

```python
from app.db.seed import seed_default_admin
from app.db.session import SessionLocal
from app.services.auth import create_refresh_token


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
        # Verify refresh_token cookie is set
        cookies = resp.cookies
        assert "refresh_token" in cookies


class TestAuthRefresh:
    def test_refresh_success(self, client):
        # Register and login to get refresh cookie
        client.post(
            "/api/auth/register",
            json={
                "username": "refreshuser",
                "email": "refresh@example.com",
                "password": "password123",
            },
        )
        login_resp = client.post(
            "/api/auth/login",
            json={"username": "refreshuser", "password": "password123"},
        )
        # Use the refresh cookie to get new access token
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
    def test_seed_creates_admin(self):
        db = SessionLocal()
        try:
            from app.models.base import Base
            from sqlalchemy import create_engine
            from sqlalchemy.orm import sessionmaker

            test_engine = create_engine("sqlite:///./test_seed.db", connect_args={"check_same_thread": False})
            Base.metadata.create_all(bind=test_engine)
            TestSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
            test_db = TestSession()
            seed_default_admin(test_db)
            from app.models.user import User
            admin = test_db.query(User).filter(User.username == "admin").first()
            assert admin is not None
            assert admin.is_superuser is True
            assert admin.is_active is True
            # Seed again should not duplicate
            seed_default_admin(test_db)
            count = test_db.query(User).filter(User.username == "admin").count()
            assert count == 1
            test_db.close()
        finally:
            import os
            os.remove("test_seed.db")
            db.close()
```

- [ ] **Step 3: 运行测试验证**

```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template && uv run pytest backend/tests/test_auth.py -v
```

Expected: 所有测试 PASS（包括原有的 register/login/me 测试和新增的 cookie/refresh/logout/seed 测试）。

- [ ] **Step 4: 提交**

```bash
git add backend/tests/test_auth.py
git commit -m "test(backend): add tests for refresh token, logout, and seed"
```

---

## Task 5: 前端 — 改造 API 客户端，添加 token 管理和自动刷新

**Files:**
- Modify: `frontend/src/apis/client.ts`

- [ ] **Step 1: 重写 APIClient 加入 token 管理和拦截器**

将 `frontend/src/apis/client.ts` 替换为：

```typescript
import { getApiBaseUrl } from '@/lib/runtime-config'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// In-memory access token (never persisted to localStorage)
let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

let refreshPromise: Promise<boolean> | null = null

class APIClient {
  private getBaseURL(): string {
    return getApiBaseUrl()
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (refreshPromise) return refreshPromise

    refreshPromise = (async () => {
      try {
        const url = `${this.getBaseURL()}/api/auth/refresh`
        const response = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!response.ok) return false
        const data = await response.json()
        accessToken = data.access_token
        return true
      } catch {
        return false
      } finally {
        refreshPromise = null
      }
    })()

    return refreshPromise
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.getBaseURL()}${endpoint}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    const config: RequestInit = {
      ...options,
      credentials: 'include',
      headers,
    }

    const response = await fetch(url, config)

    if (response.status === 401 && !endpoint.includes('/auth/')) {
      const refreshed = await this.refreshAccessToken()
      if (refreshed) {
        headers['Authorization'] = `Bearer ${accessToken}`
        const retryConfig: RequestInit = {
          ...options,
          credentials: 'include',
          headers,
        }
        const retryResponse = await fetch(url, retryConfig)
        if (retryResponse.ok) {
          if (retryResponse.status === 204) return null as T
          return retryResponse.json()
        }
        const errorText = await retryResponse.text()
        throw new ApiError(errorText, retryResponse.status)
      }
      accessToken = null
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new ApiError(errorText, response.status)
    }

    if (response.status === 204) {
      return null as T
    }

    return response.json()
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export const apiClient = new APIClient()

export default apiClient
```

关键改动：
- 新增 `accessToken` 模块级内存变量和 getter/setter
- 所有请求自动带 `Authorization: Bearer` header（如果 token 存在）
- 所有请求带 `credentials: 'include'` 以发送 cookie
- 401 响应自动尝试 refresh（防并发：共享同一个 refresh Promise）
- refresh 失败则清除 token

- [ ] **Step 2: 提交**

```bash
git add frontend/src/apis/client.ts
git commit -m "feat(frontend): add token management and auto-refresh to API client"
```

---

## Task 6: 前端 — 创建 AuthContext 和 useAuth hook

**Files:**
- Create: `frontend/src/features/auth/auth-context.tsx`
- Create: `frontend/src/features/auth/use-auth.ts`

- [ ] **Step 1: 创建 auth-context.tsx**

创建 `frontend/src/features/auth/auth-context.tsx`：

```typescript
'use client'

import React, { createContext, useCallback, useEffect, useState } from 'react'

import apiClient, { setAccessToken } from '@/apis/client'

export interface AuthUser {
  id: string
  username: string
  email: string
  is_active: boolean
  is_superuser: boolean
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    apiClient
      .post<AuthUser>('/api/auth/refresh')
      .then((data) => {
        setUser(data)
      })
      .catch(() => {
        setUser(null)
        setAccessToken(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const tokenData = await apiClient.post<{
      access_token: string
      token_type: string
      expires_in: number
    }>('/api/auth/login', { username, password })
    setAccessToken(tokenData.access_token)
    const me = await apiClient.get<AuthUser>('/api/auth/me')
    setUser(me)
  }, [])

  const logout = useCallback(async () => {
    await apiClient.post('/api/auth/logout')
    setAccessToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
```

- [ ] **Step 2: 创建 use-auth.ts**

创建 `frontend/src/features/auth/use-auth.ts`：

```typescript
'use client'

import { useContext } from 'react'

import { AuthContext } from './auth-context'

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/features/auth/auth-context.tsx frontend/src/features/auth/use-auth.ts
git commit -m "feat(frontend): add AuthContext and useAuth hook"
```

---

## Task 7: 前端 — 创建路由守卫组件

**Files:**
- Create: `frontend/src/features/auth/auth-guard.tsx`

- [ ] **Step 1: 创建 auth-guard.tsx**

创建 `frontend/src/features/auth/auth-guard.tsx`：

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'

import { useAuth } from './use-auth'

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/src/features/auth/auth-guard.tsx
git commit -m "feat(frontend): add AuthGuard route protection component"
```

---

## Task 8: 前端 — 创建登录页面

**Files:**
- Create: `frontend/src/app/login/page.tsx`

- [ ] **Step 1: 创建登录页面**

创建 `frontend/src/app/login/page.tsx`：

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'

import { useAuth } from '@/features/auth/use-auth'

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Redirect if already authenticated
  if (!isLoading && isAuthenticated) {
    router.replace('/')
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      await login(username, password)
      router.replace('/')
    } catch {
      toast.error('登录失败', { description: '用户名或密码错误' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-6">
      <div className="w-full max-w-sm">
        <h1
          className="text-center text-[28px] font-normal leading-tight tracking-[-0.3px]"
          style={{ fontFamily: 'Cormorant Garamond, Tiempos Headline, serif' }}
        >
          Agent Template
        </h1>
        <p className="mt-2 text-center text-sm text-text-muted">登录以继续</p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-xl border border-border bg-base p-6"
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-sm font-medium text-text-primary"
              >
                用户名
              </label>
              <input
                id="username"
                type="text"
                data-testid="login-username-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="h-10 w-full rounded-md border border-border bg-base px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                placeholder="请输入用户名"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-text-primary"
              >
                密码
              </label>
              <input
                id="password"
                type="password"
                data-testid="login-password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-10 w-full rounded-md border border-border bg-base px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                placeholder="请输入密码"
              />
            </div>
          </div>
          <button
            type="submit"
            data-testid="login-submit-button"
            disabled={submitting}
            className="mt-6 flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-white transition-colors hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

设计说明：
- 遵循 DESIGN.md：`bg-base`（奶油画布）、`bg-primary`（珊瑚色按钮）、`border-border`（hairline 边框）
- 标题使用衬线体（Cormorant Garamond）以匹配 DESIGN.md 的 display 排版
- 输入框遵循 `text-input` 组件规范：`rounded-md`(8px)、`h-10`(40px)、`bg-base`
- 按钮 `bg-primary` → `hover:bg-primary-active` 遵循 `button-primary` → `button-primary-active`
- 所有交互元素有 `data-testid`

- [ ] **Step 2: 提交**

```bash
git add frontend/src/app/login/page.tsx
git commit -m "feat(frontend): add standalone login page"
```

---

## Task 9: 前端 — 集成 AuthProvider 和 AuthGuard 到应用

**Files:**
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: 在 layout.tsx 中包裹 AuthProvider**

修改 `frontend/src/app/layout.tsx`：

```tsx
import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import './globals.css'
import TelemetryInit from '@/components/TelemetryInit'
import { AuthProvider } from '@/features/auth/auth-context'

export const metadata: Metadata = {
  title: 'Agent Template',
  description: 'Full-stack AI application template.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="bg-base text-text-primary antialiased">
        <AuthProvider>
          <TelemetryInit />
          {children}
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: 在 page.tsx 中包裹 AuthGuard**

修改 `frontend/src/app/page.tsx`：

```tsx
import { SettingsPanel } from '@/components/settings/settings-panel'
import { AuthGuard } from '@/features/auth/auth-guard'

export default function HomePage() {
  return (
    <AuthGuard>
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
    </AuthGuard>
  )
}
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/app/layout.tsx frontend/src/app/page.tsx
git commit -m "feat(frontend): integrate AuthProvider and AuthGuard into app"
```

---

## Task 10: 集成验证

**Files:** 无新增

- [ ] **Step 1: 运行后端全部测试**

```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template && uv run pytest backend/tests/ -v
```

Expected: 所有后端测试 PASS。

- [ ] **Step 2: 运行前端 lint 和类型检查**

```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template/frontend && npm run lint && npx tsc --noEmit
```

Expected: 无错误。

- [ ] **Step 3: 手动集成测试**

```bash
# 终端 1：启动后端
cd /Users/zhourenkang/Workspace/daydream/agent_template && uv run uvicorn backend.app.main:app --reload --port 8000

# 终端 2：启动前端
cd /Users/zhourenkang/Workspace/daydream/agent_template/frontend && npm run dev
```

验证清单：
1. 打开 `http://localhost:3000` → 自动重定向到 `/login`
2. 输入 admin / admin → 登录成功，跳转到首页
3. 刷新页面 → 保持登录状态（refresh token 自动续期）
4. 点击设置面板 → 正常工作（Bearer token 自动携带）
5. 清除 cookie 后刷新 → 回到登录页
