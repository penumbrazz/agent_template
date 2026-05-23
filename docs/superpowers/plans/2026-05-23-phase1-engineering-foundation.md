# 第一批工程底座迁移实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 在 `/Users/zhourenkang/Workspace/daydream/agent_template` 新建一个干净、可运行、可继续扩展的全栈 AI 应用模板工程底座。

**架构：** 目标项目不是 Wegent 的删减版，而是一个独立模板仓库。Wegent 仅作为只读参考，第一批只迁移通用工程能力：FastAPI 后端、Next.js 前端、Python shared 包、OpenTelemetry、Docker、本地开发脚本、测试和文档骨架。

**技术栈：** Python 3.10+、FastAPI、SQLAlchemy、Alembic、MySQL、Redis、uv、Next.js 15、React 19、TypeScript、Tailwind、shadcn/ui、OpenTelemetry、Docker Compose、pytest、Jest、Playwright。

---

## 0. 边界和原则

### 源项目

- Wegent 源目录：`/Users/zhourenkang/Workspace/Python/use/Wegent`
- 目标模板目录：`/Users/zhourenkang/Workspace/daydream/agent_template`
- 源目录只能读，不能修改。

### 第一批必须迁移

- 根目录工程配置：`.gitignore`、`.env.example`、`README.md`、`AGENTS.md`、`pyproject.toml`
- Docker 编排：核心服务 `mysql`、`redis`、`backend`、`frontend`，可选 `telemetry`
- Backend 工程底座：FastAPI app、配置、日志、数据库、Alembic、健康检查、基础认证、用户模型、API router、测试
- Frontend 工程底座：Next.js app router、Tailwind、shadcn/ui 基础组件、runtime config、i18n、API client、基础布局、登录页占位、健康页、测试
- Shared Python 包：日志、HTTP 工具、加密工具、OpenTelemetry 目录
- OpenTelemetry：保留 Python 和前端 tracer、`/otlp/traces` proxy、collector compose
- 脚本：`scripts/dev.sh`、`scripts/test.sh`、`scripts/format.sh`
- 文档结构：`docs/zh`、`docs/en`

### 第一批不能迁移

- 不迁移 Wegent 品牌、Logo、初始化数据、README 内容。
- 不迁移 `Ghost`、`Bot`、`Team`、`Task`、`Skill` 业务模型。
- 不迁移 executor、executor_manager、chat_shell、knowledge_runtime、knowledge_engine。
- 不迁移钉钉、Telegram、设备、Wiki、订阅、公共智能体市场、宠物、XMind、Dify、Agno、Claude Code 执行器。
- 不迁移真实 `.env`、token、密钥、数据库数据、日志、`.venv`、`node_modules`、`.next`。

### 命名原则

模板内使用通俗命名，后续 AI 模块按下面映射设计，但第一批不实现这些业务：

| Wegent 概念 | 模板概念 |
| --- | --- |
| Ghost | PromptTemplate |
| Bot | AgentProfile |
| Team | AgentWorkflow |
| Task | Execution / Conversation |
| Skill | ToolCapability |
| Shell | RuntimeEnvironment |
| Model | ModelProvider |

### 代码风格

- 用户沟通、文档使用中文。
- 代码注释使用英文。
- Python 使用 Black + isort，行宽 88。
- TypeScript 使用 Prettier，单引号，不使用分号。
- 交互元素保留或新增 `data-testid`。
- 不复制不可解释的大块业务代码。能从零写清楚的模板代码，优先从零写。

---

## 1. 目标目录结构

完成第一批后，目标目录应至少包含：

```text
/Users/zhourenkang/Workspace/daydream/agent_template
├── AGENTS.md
├── README.md
├── README_zh.md
├── .env.example
├── .gitignore
├── docker-compose.yml
├── docker-compose.dev.yml
├── pyproject.toml
├── backend
│   ├── alembic
│   ├── alembic.ini
│   ├── app
│   │   ├── api
│   │   ├── core
│   │   ├── db
│   │   ├── models
│   │   ├── schemas
│   │   ├── services
│   │   └── main.py
│   ├── tests
│   ├── .env.example
│   ├── pyproject.toml
│   └── pytest.ini
├── frontend
│   ├── src
│   │   ├── app
│   │   ├── apis
│   │   ├── components
│   │   ├── hooks
│   │   ├── i18n
│   │   ├── lib
│   │   └── types
│   ├── public
│   ├── package.json
│   ├── next.config.js
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── components.json
│   └── jest.config.js
├── shared
│   ├── telemetry
│   ├── utils
│   ├── logger.py
│   ├── pyproject.toml
│   └── pytest.ini
├── telemetry
│   ├── README.md
│   ├── docker-compose.yml
│   └── otel-collector-config.yaml
├── observability
│   ├── README.md
│   ├── sentry
│   │   └── README.md
│   └── langfuse
│       └── README.md
├── scripts
│   ├── dev.sh
│   ├── test.sh
│   └── format.sh
└── docs
    ├── zh
    └── en
```

---

## 2. 文件映射

### 可以直接参考或裁剪迁移

- `Wegent/pyproject.toml` -> `agent_template/pyproject.toml`
- `Wegent/.gitignore` -> `agent_template/.gitignore`
- `Wegent/.env.example` -> `agent_template/.env.example`
- `Wegent/backend/pyproject.toml` -> `agent_template/backend/pyproject.toml`
- `Wegent/backend/pytest.ini` -> `agent_template/backend/pytest.ini`
- `Wegent/backend/alembic.ini` -> `agent_template/backend/alembic.ini`
- `Wegent/frontend/package.json` -> `agent_template/frontend/package.json`
- `Wegent/frontend/next.config.js` -> `agent_template/frontend/next.config.js`
- `Wegent/frontend/tsconfig.json` -> `agent_template/frontend/tsconfig.json`
- `Wegent/frontend/tailwind.config.js` -> `agent_template/frontend/tailwind.config.js`
- `Wegent/frontend/postcss.config.js` -> `agent_template/frontend/postcss.config.js`
- `Wegent/frontend/components.json` -> `agent_template/frontend/components.json`
- `Wegent/shared/telemetry/**` -> `agent_template/shared/telemetry/**`
- `Wegent/shared/logger.py` -> `agent_template/shared/logger.py`
- `Wegent/shared/utils/crypto.py` -> `agent_template/shared/utils/crypto.py`
- `Wegent/shared/utils/http_client.py` -> `agent_template/shared/utils/http_client.py`
- `Wegent/shared/utils/http_util.py` -> `agent_template/shared/utils/http_util.py`
- `Wegent/shared/utils/sensitive_data_masker.py` -> `agent_template/shared/utils/sensitive_data_masker.py`
- `Wegent/frontend/src/lib/telemetry/**` -> `agent_template/frontend/src/lib/telemetry/**`
- `Wegent/frontend/src/app/otlp/traces/route.ts` -> `agent_template/frontend/src/app/otlp/traces/route.ts`
- `Wegent/frontend/src/app/runtime-config/route.ts` -> 参考后重写成轻量版
- `Wegent/telemetry/**` -> `agent_template/telemetry/**`

### 只参考模式，不能整块复制

- `Wegent/backend/app/main.py`
- `Wegent/backend/app/core/config.py`
- `Wegent/backend/app/core/logging.py`
- `Wegent/backend/app/db/session.py`
- `Wegent/backend/app/models/user.py`
- `Wegent/backend/app/services/auth.py`
- `Wegent/backend/app/api/endpoints/auth.py`
- `Wegent/frontend/src/app/layout.tsx`
- `Wegent/frontend/src/apis/client.ts`
- `Wegent/frontend/src/i18n/**`
- `Wegent/frontend/src/components/ui/**`

这些文件包含较多 Wegent 业务耦合，迁移时只借鉴结构和少量通用逻辑。

---

## 3. 实施任务

### Task 1: 初始化根目录工程骨架

**Files:**

- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/AGENTS.md`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/README.md`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/README_zh.md`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/.env.example`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/.gitignore`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/pyproject.toml`

- [ ] **Step 1: 初始化 git 仓库**

```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template
git init
```

Expected: `.git` 目录存在。

- [ ] **Step 2: 创建 `.gitignore`**

必须包含：

```gitignore
.DS_Store
.env
.env.*
!.env.example
*.log
logs/
.pids/
.venv/
venv/
__pycache__/
.pytest_cache/
.mypy_cache/
.ruff_cache/
dist/
build/
*.egg-info/
node_modules/
.next/
coverage/
playwright-report/
test-results/
frontend/.next/
frontend/node_modules/
backend/.venv/
shared/.venv/
```

- [ ] **Step 3: 创建根 `pyproject.toml`**

保留 Black/isort 根配置，`known_first_party` 改为模板包名：

```toml
[tool.black]
line-length = 88
target-version = ['py310']
include = '\\.pyi?$'
exclude = '''
/(
    \\.eggs
  | \\.git
  | \\.hg
  | \\.mypy_cache
  | \\.tox
  | \\.venv
  | venv
  | _build
  | buck-out
  | build
  | dist
  | alembic
  | node_modules
  | frontend
)/
'''

[tool.isort]
profile = "black"
line_length = 88
multi_line_output = 3
include_trailing_comma = true
force_grid_wrap = 0
use_parentheses = true
ensure_newline_before_comments = true
skip = ["alembic", ".venv", "venv", "node_modules", "frontend"]
skip_gitignore = true
known_first_party = ["app", "shared"]
```

- [ ] **Step 4: 创建 `AGENTS.md`**

内容必须说明：

```markdown
# AGENTS.md

总是用中文回复用户、编写文档。

## 项目定位

这是一个全栈 AI 应用模板，不是 Wegent 的删减版。Wegent 只作为迁移参考。

## 第一批边界

- 保留 FastAPI、Next.js、shared、OpenTelemetry、Docker、测试和文档底座。
- 暂不实现多智能体编排、提示词模板、模型供应商、知识库、工具能力等业务模块。
- 不引入 Wegent 品牌、Logo、初始化数据和专有业务名。

## 代码规范

- Python 使用 uv、Black、isort、类型注解。
- TypeScript 使用严格模式、函数组件、单引号、不使用分号。
- 代码注释使用英文，文档使用中文优先。
- 交互式前端元素必须添加 `data-testid`。
```

- [ ] **Step 5: 创建 `README_zh.md` 和 `README.md`**

`README_zh.md` 必须包含：

```markdown
# Agent Template

全栈 AI 应用模板，包含 FastAPI 后端、Next.js 前端、共享 Python 包、OpenTelemetry、Docker Compose、本地开发脚本和测试骨架。

## 模块

- `backend`: FastAPI API 服务
- `frontend`: Next.js Web 应用
- `shared`: Python 共享工具和遥测
- `telemetry`: OpenTelemetry Collector、Jaeger、Elasticsearch、Kibana 可选观测栈
- `observability`: Sentry 和 Langfuse 自托管说明

## 快速开始

```bash
cp .env.example .env
docker compose up -d mysql redis
cd backend && uv sync && uv run pytest
cd ../frontend && npm install && npm test
```
```

`README.md` 写英文版，内容和中文版一致。

- [ ] **Step 6: 提交**

```bash
git add AGENTS.md README.md README_zh.md .env.example .gitignore pyproject.toml
git commit -m "chore: initialize template repository"
```

---

### Task 2: 创建 Backend 工程底座

**Files:**

- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/backend/pyproject.toml`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/backend/pytest.ini`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/backend/.env.example`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/backend/app/main.py`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/backend/app/core/config.py`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/backend/app/core/logging.py`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/backend/app/api/router.py`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/backend/app/api/endpoints/health.py`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/backend/app/db/session.py`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/backend/app/models/base.py`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/backend/app/models/user.py`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/backend/app/schemas/user.py`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/backend/app/services/auth.py`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/backend/tests/test_health.py`

- [ ] **Step 1: 创建 Python 包目录**

```bash
mkdir -p backend/app/{api/endpoints,core,db,models,schemas,services}
mkdir -p backend/tests
touch backend/app/__init__.py backend/app/api/__init__.py backend/app/api/endpoints/__init__.py
touch backend/app/core/__init__.py backend/app/db/__init__.py backend/app/models/__init__.py
touch backend/app/schemas/__init__.py backend/app/services/__init__.py backend/tests/__init__.py
```

- [ ] **Step 2: 创建 `backend/pyproject.toml`**

依赖控制在工程底座范围：

```toml
[project]
name = "agent-template-backend"
version = "0.1.0"
description = "Backend API service for Agent Template"
readme = "README.md"
requires-python = ">=3.10,<3.14"
dependencies = [
    "fastapi>=0.109.1",
    "uvicorn[standard]>=0.27.0",
    "pydantic>=2.5.3",
    "pydantic-settings>=2.1.0",
    "python-multipart>=0.0.6",
    "email-validator>=2.0.0",
    "sqlalchemy>=2.0.25",
    "pymysql>=1.1.0",
    "alembic>=1.13.1",
    "redis>=5.0.1",
    "python-jose[cryptography]>=3.3.0",
    "passlib[bcrypt]>=1.7.4",
    "bcrypt>=4.1.0,<5.0.0",
    "python-dotenv>=1.0.0",
    "structlog>=23.1.0",
    "orjson>=3.9.0",
    "httpx[brotli]>=0.26.0",
    "opentelemetry-api>=1.27.0",
]

[dependency-groups]
dev = [
    "pytest>=9.0.1",
    "pytest-asyncio>=1.3.0",
    "pytest-cov>=7.0.0",
    "pytest-mock>=3.15.1",
    "black>=23.7.0",
    "isort>=5.12.0",
    "mypy>=1.5.0",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = "-v --tb=short"
```

- [ ] **Step 3: 创建 `backend/app/core/config.py`**

配置必须轻量，避免复制 Wegent 大量业务设置：

```python
from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Agent Template"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    API_PREFIX: str = "/api"
    ENABLE_API_DOCS: bool = True

    DATABASE_URL: str = Field(
        default="mysql+pymysql://app_user:app_password@localhost:3306/agent_template"
    )
    REDIS_URL: str = "redis://localhost:6379/0"

    SECRET_KEY: str = "change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080

    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    OTEL_ENABLED: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
```

- [ ] **Step 4: 创建健康检查 API**

`backend/app/api/endpoints/health.py`:

```python
from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
```

`backend/app/api/router.py`:

```python
from fastapi import APIRouter

from app.api.endpoints import health

api_router = APIRouter()
api_router.include_router(health.router)
```

- [ ] **Step 5: 创建 FastAPI 入口**

`backend/app/main.py` 必须包含：

```python
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.logging import setup_logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    yield


def create_app() -> FastAPI:
    openapi_url = f"{settings.API_PREFIX}/openapi.json" if settings.ENABLE_API_DOCS else None
    docs_url = f"{settings.API_PREFIX}/docs" if settings.ENABLE_API_DOCS else None

    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url=openapi_url,
        docs_url=docs_url,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix=settings.API_PREFIX)
    return app


app = create_app()
```

- [ ] **Step 6: 写健康检查测试**

`backend/tests/test_health.py`:

```python
from fastapi.testclient import TestClient

from app.main import app


def test_health_check_returns_ok():
    client = TestClient(app)

    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 7: 运行测试**

```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template/backend
uv sync
uv run pytest
```

Expected: `test_health_check_returns_ok` 通过。

- [ ] **Step 8: 提交**

```bash
git add backend
git commit -m "feat(backend): add FastAPI foundation"
```

---

### Task 3: 创建 Shared 包并迁移 OpenTelemetry

**Files:**

- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/shared/pyproject.toml`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/shared/pytest.ini`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/shared/logger.py`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/shared/utils/*`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/shared/telemetry/*`

- [ ] **Step 1: 创建 shared 目录**

```bash
mkdir -p shared/utils shared/telemetry shared/tests
touch shared/__init__.py shared/utils/__init__.py shared/tests/__init__.py
```

- [ ] **Step 2: 创建 `shared/pyproject.toml`**

```toml
[project]
name = "agent-template-shared"
version = "0.1.0"
description = "Shared utilities for Agent Template"
requires-python = ">=3.10,<3.14"
dependencies = [
    "httpx[brotli]>=0.26.0",
    "cryptography>=42.0.4",
    "pycryptodome>=3.20.0",
    "structlog>=23.1.0",
    "opentelemetry-api>=1.27.0",
    "opentelemetry-sdk>=1.27.0",
    "opentelemetry-exporter-otlp>=1.27.0",
]

[dependency-groups]
dev = [
    "pytest>=9.0.1",
    "pytest-asyncio>=1.3.0",
    "black>=23.7.0",
    "isort>=5.12.0",
]
```

- [ ] **Step 3: 迁移 telemetry**

从源项目复制：

```bash
cp -R /Users/zhourenkang/Workspace/Python/use/Wegent/shared/telemetry \
  /Users/zhourenkang/Workspace/daydream/agent_template/shared/
```

然后全文替换服务名和项目名：

```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template
rg -l "Wegent|wegent" shared/telemetry | xargs sed -i '' \
  -e 's/Wegent/Agent Template/g' \
  -e 's/wegent/agent-template/g'
```

如果 Linux 环境没有 BSD `sed -i ''`，改用 `perl -pi -e`。

- [ ] **Step 4: 迁移通用工具**

从源项目复制并裁剪：

```bash
cp /Users/zhourenkang/Workspace/Python/use/Wegent/shared/logger.py shared/logger.py
cp /Users/zhourenkang/Workspace/Python/use/Wegent/shared/utils/crypto.py shared/utils/crypto.py
cp /Users/zhourenkang/Workspace/Python/use/Wegent/shared/utils/http_client.py shared/utils/http_client.py
cp /Users/zhourenkang/Workspace/Python/use/Wegent/shared/utils/http_util.py shared/utils/http_util.py
cp /Users/zhourenkang/Workspace/Python/use/Wegent/shared/utils/sensitive_data_masker.py shared/utils/sensitive_data_masker.py
```

检查这些文件，删除对 Wegent 业务模型的 import。保留 trace header 注入、敏感信息脱敏、日志配置、加密工具。

- [ ] **Step 5: 添加 shared smoke test**

`shared/tests/test_telemetry_config.py`:

```python
from shared.telemetry.config import get_otel_config, reset_otel_config


def test_otel_config_is_disabled_by_default(monkeypatch):
    monkeypatch.delenv("OTEL_ENABLED", raising=False)
    reset_otel_config()

    config = get_otel_config("agent-template-test")

    assert config.enabled is False
    assert config.service_name == "agent-template-test"
```

- [ ] **Step 6: 运行测试**

```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template/shared
uv sync
uv run pytest
```

Expected: shared 测试通过。

- [ ] **Step 7: 提交**

```bash
git add shared backend/pyproject.toml
git commit -m "feat(shared): add telemetry and common utilities"
```

---

### Task 4: 把 Backend 接入 Shared OpenTelemetry

**Files:**

- Modify: `/Users/zhourenkang/Workspace/daydream/agent_template/backend/pyproject.toml`
- Modify: `/Users/zhourenkang/Workspace/daydream/agent_template/backend/app/main.py`
- Modify: `/Users/zhourenkang/Workspace/daydream/agent_template/backend/app/core/config.py`
- Modify: `/Users/zhourenkang/Workspace/daydream/agent_template/backend/tests/test_health.py`

- [ ] **Step 1: 给 Backend 添加 shared 和 OTel instrumentation 依赖**

修改 `backend/pyproject.toml` 的 dependencies，加入：

```toml
    "opentelemetry-sdk>=1.27.0",
    "opentelemetry-exporter-otlp>=1.27.0",
    "opentelemetry-instrumentation-fastapi>=0.48b0",
    "opentelemetry-instrumentation-httpx>=0.48b0",
    "opentelemetry-instrumentation-requests>=0.48b0",
    "opentelemetry-instrumentation-sqlalchemy>=0.48b0",
    "opentelemetry-instrumentation-redis>=0.48b0",
    "opentelemetry-instrumentation-system-metrics>=0.48b0",
    "agent-template-shared",
```

并添加：

```toml
[tool.uv.sources]
agent-template-shared = { path = "../shared", editable = true }
```

- [ ] **Step 2: 在 `create_app()` 初始化 OTel**

在 `backend/app/main.py` 的 `create_app()` 中，创建 FastAPI app 后、include router 前加入：

```python
    from shared.telemetry.config import get_otel_config

    otel_config = get_otel_config("agent-template-backend")
    if otel_config.enabled:
        try:
            from shared.telemetry.core import init_telemetry
            from shared.telemetry.instrumentation import setup_opentelemetry_instrumentation

            init_telemetry(
                service_name=otel_config.service_name,
                enabled=otel_config.enabled,
                otlp_endpoint=otel_config.otlp_endpoint,
                sampler_ratio=otel_config.sampler_ratio,
                service_version=settings.VERSION,
                deployment_environment=settings.ENVIRONMENT,
                metrics_enabled=otel_config.metrics_enabled,
                capture_request_headers=otel_config.capture_request_headers,
                capture_request_body=otel_config.capture_request_body,
                capture_response_headers=otel_config.capture_response_headers,
                capture_response_body=otel_config.capture_response_body,
                max_body_size=otel_config.max_body_size,
            )
            setup_opentelemetry_instrumentation(app=app, enable_sqlalchemy=False)
        except Exception:
            pass
```

不要让 OTel 初始化失败影响服务启动。

- [ ] **Step 3: 添加 `/api/health` 测试不受 OTel 影响**

修改 `backend/tests/test_health.py`，加入：

```python
def test_health_check_works_when_otel_disabled(monkeypatch):
    monkeypatch.setenv("OTEL_ENABLED", "false")
    client = TestClient(app)

    response = client.get("/api/health")

    assert response.status_code == 200
```

- [ ] **Step 4: 运行测试**

```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template/backend
uv run pytest
```

Expected: backend 测试通过。

- [ ] **Step 5: 提交**

```bash
git add backend shared
git commit -m "feat(backend): wire OpenTelemetry foundation"
```

---

### Task 5: 创建 Frontend 工程底座

**Files:**

- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/frontend/package.json`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/frontend/next.config.js`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/frontend/tsconfig.json`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/frontend/tailwind.config.js`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/frontend/postcss.config.js`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/frontend/components.json`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/frontend/src/app/layout.tsx`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/frontend/src/app/page.tsx`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/frontend/src/app/globals.css`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/frontend/src/lib/runtime-config.ts`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/frontend/src/app/runtime-config/route.ts`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/frontend/src/apis/client.ts`

- [ ] **Step 1: 复制前端配置文件后裁剪品牌**

```bash
mkdir -p frontend/src/{app,apis,components,hooks,i18n,lib,types}
cp /Users/zhourenkang/Workspace/Python/use/Wegent/frontend/next.config.js frontend/next.config.js
cp /Users/zhourenkang/Workspace/Python/use/Wegent/frontend/tsconfig.json frontend/tsconfig.json
cp /Users/zhourenkang/Workspace/Python/use/Wegent/frontend/tailwind.config.js frontend/tailwind.config.js
cp /Users/zhourenkang/Workspace/Python/use/Wegent/frontend/postcss.config.js frontend/postcss.config.js
cp /Users/zhourenkang/Workspace/Python/use/Wegent/frontend/components.json frontend/components.json
```

检查配置文件，删除 Wegent 专属 rewrite、asset、logo、业务路径。保留 `@/*` alias、Tailwind、shadcn 相关配置。

- [ ] **Step 2: 创建轻量 `package.json`**

只保留第一批需要的依赖：

```json
{
  "name": "agent-template-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "TURBOPACK=1 next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write .",
    "test": "jest",
    "test:watch": "jest --watch",
    "e2e": "playwright test"
  },
  "dependencies": {
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/context-zone": "^2.2.0",
    "@opentelemetry/core": "^2.2.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.208.0",
    "@opentelemetry/instrumentation": "^0.208.0",
    "@opentelemetry/instrumentation-document-load": "^0.54.0",
    "@opentelemetry/instrumentation-fetch": "^0.208.0",
    "@opentelemetry/opentelemetry-browser-detector": "^0.208.0",
    "@opentelemetry/resources": "^2.2.0",
    "@opentelemetry/sdk-trace-base": "^2.2.0",
    "@opentelemetry/sdk-trace-web": "^2.2.0",
    "@opentelemetry/semantic-conventions": "^1.38.0",
    "@radix-ui/react-slot": "^1.2.4",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "i18next": "^25.5.2",
    "lucide-react": "^0.554.0",
    "next": "^15.1.9",
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "react-i18next": "^15.7.3",
    "tailwind-merge": "^3.4.0",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^4.1.12"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.1.0",
    "@testing-library/react": "^16.0.0",
    "@types/jest": "^29.5.0",
    "@types/node": "^22.10.1",
    "@types/react": "^19.0.1",
    "@types/react-dom": "^19.0.2",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.17.0",
    "eslint-config-next": "15.1.3",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "postcss": "^8.5.0",
    "prettier": "^3.4.2",
    "tailwindcss": "^3.4.16",
    "typescript": "^5.7.3"
  }
}
```

- [ ] **Step 3: 创建基础页面**

`frontend/src/app/page.tsx`:

```tsx
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
    </main>
  )
}
```

`frontend/src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import './globals.css'
import TelemetryInit from '@/components/TelemetryInit'

export const metadata: Metadata = {
  title: 'Agent Template',
  description: 'Full-stack AI application template.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="bg-base text-text-primary antialiased">
        <TelemetryInit />
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 4: 创建基础样式**

`frontend/src/app/globals.css` 必须定义 calm UI 变量：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-bg-base: 255 255 255;
  --color-bg-surface: 247 247 248;
  --color-text-primary: 26 26 26;
  --color-text-secondary: 102 102 102;
  --color-text-muted: 136 136 136;
  --color-primary: 20 184 166;
  --color-border: 224 224 224;
  --radius: 0.5rem;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}
```

- [ ] **Step 5: 创建 runtime config**

轻量支持：

```typescript
export interface RuntimeConfig {
  apiUrl: string
  otelEnabled: boolean
  otelServiceName: string
  otelCollectorEndpoint: string
  appVersion: string
}
```

默认值：

```typescript
{
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  otelEnabled: process.env.NEXT_PUBLIC_OTEL_ENABLED === 'true',
  otelServiceName: process.env.NEXT_PUBLIC_OTEL_SERVICE_NAME || 'agent-template-frontend',
  otelCollectorEndpoint: process.env.NEXT_PUBLIC_OTEL_COLLECTOR_ENDPOINT || 'http://localhost:4318',
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION || 'dev',
}
```

- [ ] **Step 6: 运行前端安装和测试**

```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template/frontend
npm install
npm test -- --watch=false
```

如果还没有测试文件，`npm test -- --watch=false` 可以失败于 “No tests found”。这一步至少要保证 `npm install` 成功。

- [ ] **Step 7: 提交**

```bash
git add frontend
git commit -m "feat(frontend): add Next.js foundation"
```

---

### Task 6: 迁移前端 OpenTelemetry

**Files:**

- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/frontend/src/lib/telemetry/*`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/frontend/src/components/TelemetryInit.tsx`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/frontend/src/hooks/useTraceAction.ts`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/frontend/src/app/otlp/traces/route.ts`

- [ ] **Step 1: 复制 telemetry 前端代码**

```bash
mkdir -p frontend/src/lib/telemetry frontend/src/components frontend/src/hooks frontend/src/app/otlp/traces
cp -R /Users/zhourenkang/Workspace/Python/use/Wegent/frontend/src/lib/telemetry/* frontend/src/lib/telemetry/
cp /Users/zhourenkang/Workspace/Python/use/Wegent/frontend/src/components/TelemetryInit.tsx frontend/src/components/TelemetryInit.tsx
cp /Users/zhourenkang/Workspace/Python/use/Wegent/frontend/src/hooks/useTraceAction.ts frontend/src/hooks/useTraceAction.ts
cp /Users/zhourenkang/Workspace/Python/use/Wegent/frontend/src/app/otlp/traces/route.ts frontend/src/app/otlp/traces/route.ts
```

- [ ] **Step 2: 替换服务名**

```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template
rg -l "wegent|Wegent" frontend/src/lib/telemetry frontend/src/components/TelemetryInit.tsx frontend/src/hooks/useTraceAction.ts frontend/src/app/otlp/traces/route.ts | xargs sed -i '' \
  -e 's/wegent-frontend/agent-template-frontend/g' \
  -e 's/Wegent/Agent Template/g' \
  -e 's/wegent/agent-template/g'
```

- [ ] **Step 3: 修复 import**

确保 `@/lib/runtime-config` 提供 `getRuntimeConfigSync()`，并且 `TelemetryInit` 在 `layout.tsx` 中已引入。

- [ ] **Step 4: 运行 TypeScript 检查**

```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template/frontend
npm run build
```

Expected: build 成功。如果失败，优先修复缺失 import、runtime config 类型和 Next route 类型。

- [ ] **Step 5: 提交**

```bash
git add frontend
git commit -m "feat(frontend): add OpenTelemetry tracing"
```

---

### Task 7: 创建 Docker 和开发脚本

**Files:**

- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/docker-compose.yml`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/docker-compose.dev.yml`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/backend/Dockerfile`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/frontend/Dockerfile`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/scripts/dev.sh`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/scripts/test.sh`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/scripts/format.sh`

- [ ] **Step 1: 创建核心 Docker Compose**

`docker-compose.yml` 只包含 `mysql`、`redis`、`backend`、`frontend`：

```yaml
services:
  mysql:
    image: mysql:9.4
    container_name: agent-template-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-root_password}
      MYSQL_DATABASE: ${MYSQL_DATABASE:-agent_template}
      MYSQL_USER: ${MYSQL_USER:-app_user}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:-app_password}
    ports:
      - "${MYSQL_PORT:-3306}:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - agent-template-network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${MYSQL_ROOT_PASSWORD:-root_password}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7
    container_name: agent-template-redis
    restart: unless-stopped
    ports:
      - "${REDIS_PORT:-6379}:6379"
    volumes:
      - redis_data:/data
    networks:
      - agent-template-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    container_name: agent-template-backend
    restart: unless-stopped
    ports:
      - "${BACKEND_PORT:-8000}:8000"
    environment:
      DATABASE_URL: mysql+pymysql://${MYSQL_USER:-app_user}:${MYSQL_PASSWORD:-app_password}@mysql:3306/${MYSQL_DATABASE:-agent_template}
      REDIS_URL: redis://redis:6379/0
      SECRET_KEY: ${BACKEND_SECRET_KEY:-change-me}
      OTEL_ENABLED: ${OTEL_ENABLED:-false}
      OTEL_SERVICE_NAME: agent-template-backend
      OTEL_EXPORTER_OTLP_ENDPOINT: ${OTEL_EXPORTER_OTLP_ENDPOINT:-http://otel-collector:4317}
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - agent-template-network

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    container_name: agent-template-frontend
    restart: unless-stopped
    ports:
      - "${FRONTEND_PORT:-3000}:3000"
    environment:
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:8000}
      NEXT_PUBLIC_OTEL_ENABLED: ${NEXT_PUBLIC_OTEL_ENABLED:-false}
      NEXT_PUBLIC_OTEL_SERVICE_NAME: agent-template-frontend
      NEXT_PUBLIC_OTEL_COLLECTOR_ENDPOINT: ${NEXT_PUBLIC_OTEL_COLLECTOR_ENDPOINT:-http://localhost:4318}
    depends_on:
      - backend
    networks:
      - agent-template-network

volumes:
  mysql_data:
  redis_data:

networks:
  agent-template-network:
    driver: bridge
    name: agent-template-network
```

- [ ] **Step 2: 创建脚本**

`scripts/test.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR/shared"
uv run pytest

cd "$ROOT_DIR/backend"
uv run pytest

cd "$ROOT_DIR/frontend"
npm test -- --watch=false
```

`scripts/format.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"
black backend shared
isort backend shared

cd "$ROOT_DIR/frontend"
npm run format
```

`scripts/dev.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

docker compose up -d mysql redis
```

设置可执行权限：

```bash
chmod +x scripts/*.sh
```

- [ ] **Step 3: 运行基础容器**

```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template
docker compose up -d mysql redis
docker compose ps
```

Expected: mysql 和 redis healthy 或 running。

- [ ] **Step 4: 提交**

```bash
git add docker-compose.yml docker-compose.dev.yml backend/Dockerfile frontend/Dockerfile scripts
git commit -m "chore: add Docker and development scripts"
```

---

### Task 8: 迁移可选 Telemetry 栈和 Observability 说明

**Files:**

- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/telemetry/README.md`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/telemetry/docker-compose.yml`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/telemetry/otel-collector-config.yaml`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/observability/README.md`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/observability/sentry/README.md`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/observability/langfuse/README.md`

- [ ] **Step 1: 复制 telemetry 栈**

```bash
cp -R /Users/zhourenkang/Workspace/Python/use/Wegent/telemetry \
  /Users/zhourenkang/Workspace/daydream/agent_template/
```

- [ ] **Step 2: 替换项目名和网络名**

```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template
rg -l "wegent|Wegent" telemetry | xargs sed -i '' \
  -e 's/wegent-network/agent-template-network/g' \
  -e 's/wegent/agent-template/g' \
  -e 's/Wegent/Agent Template/g'
```

- [ ] **Step 3: 创建 Observability 说明**

`observability/README.md` 必须说明：

```markdown
# Observability

模板使用三层观测设计：

- OpenTelemetry：统一 trace/metrics 底层。
- Sentry：错误监控、性能问题、前端 source map、release tracking。
- Langfuse：AI 调用链、提示词、模型调用、工具调用、工作流 trace。

第一批只迁移 OpenTelemetry。Sentry 和 Langfuse 作为可选自托管栈保留说明，不默认启动。
```

`observability/sentry/README.md` 必须说明使用官方 `getsentry/self-hosted`，不要把完整 Sentry compose 内联进主 compose。

`observability/langfuse/README.md` 必须说明 Langfuse 官方 Docker Compose 可用于本地或单机部署，默认不与应用一起启动，避免端口和资源冲突。

- [ ] **Step 4: 提交**

```bash
git add telemetry observability
git commit -m "docs: add optional observability stack"
```

---

### Task 9: 创建中英文文档骨架

**Files:**

- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/docs/zh/README.md`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/docs/en/README.md`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/docs/zh/developer-guide/overview.md`
- Create: `/Users/zhourenkang/Workspace/daydream/agent_template/docs/en/developer-guide/overview.md`

- [ ] **Step 1: 创建目录**

```bash
mkdir -p docs/zh/developer-guide docs/en/developer-guide
```

- [ ] **Step 2: 写中文文档**

每个 markdown 文件必须有 frontmatter：

```markdown
---
sidebar_position: 1
---
```

`docs/zh/developer-guide/overview.md` 说明第一批工程底座、目录结构、启动方式、测试方式。

- [ ] **Step 3: 写英文文档**

英文版本和中文版本内容一致。

- [ ] **Step 4: 提交**

```bash
git add docs
git commit -m "docs: add developer guide scaffold"
```

---

### Task 10: 最终验证

- [ ] **Step 1: 检查不可迁移内容**

```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template
rg -n "Ghost|Bot|Team|Wegent|wecode|weibo|Dify|Agno|DingTalk|Telegram|Pet|Wiki|Subscription" .
```

Expected: 只允许在迁移文档或明确说明“不要迁移”的上下文中出现。业务代码中不能出现。

- [ ] **Step 2: 检查密钥**

```bash
rg -n "sk-|xoxb-|AKIA|BEGIN PRIVATE KEY|SECRET_KEY=.*[A-Za-z0-9]{32,}" .
```

Expected: 不出现真实密钥。

- [ ] **Step 3: 运行 Python 测试**

```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template/shared
uv run pytest

cd /Users/zhourenkang/Workspace/daydream/agent_template/backend
uv run pytest
```

Expected: 全部通过。

- [ ] **Step 4: 运行前端验证**

```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template/frontend
npm run build
```

Expected: build 成功。

- [ ] **Step 5: 运行 Docker 基础服务**

```bash
cd /Users/zhourenkang/Workspace/daydream/agent_template
docker compose up -d mysql redis
docker compose ps
```

Expected: mysql、redis running 或 healthy。

- [ ] **Step 6: 最终提交**

```bash
git status --short
git add .
git commit -m "chore: complete phase 1 engineering foundation"
```

如果没有未提交变更，不需要创建空提交。

---

## 4. Claude 执行提示

把下面这段作为执行提示交给 Claude：

```text
你是迁移执行者。请在 /Users/zhourenkang/Workspace/daydream/agent_template 中执行 docs/superpowers/plans/2026-05-23-phase1-engineering-foundation.md。

要求：
1. 源项目 /Users/zhourenkang/Workspace/Python/use/Wegent 只读，禁止修改。
2. 目标项目是全新模板，不是 Wegent 删减版。
3. 逐项执行计划，优先保证可运行、可测试、无 Wegent 业务耦合。
4. 文档和汇报使用中文，代码注释使用英文。
5. 不复制真实 .env、日志、node_modules、.next、.venv、数据库数据。
6. 完成后运行最终验证命令，并把失败项、原因、已修复内容写到最终汇报。
7. 如果计划里的某个命令因环境差异失败，先用等价方式修复，不要跳过。
```

---

## 5. 验收标准

第一批迁移完成后，必须满足：

- 目标仓库有独立 git 历史。
- `backend` 可以运行健康检查测试。
- `shared` 可以运行 telemetry config 测试。
- `frontend` 至少可以完成依赖安装和构建，或清楚记录阻塞原因。
- `docker compose up -d mysql redis` 可用。
- OTel 代码存在但默认关闭。
- Sentry 和 Langfuse 不默认启动，只在 `observability/` 中有自托管接入说明。
- 业务代码中没有 Wegent 专属概念和品牌残留。
- 没有真实密钥。
