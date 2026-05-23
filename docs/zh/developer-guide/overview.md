---
sidebar_position: 1
---

# 工程底座概览

## 第一批工程底座

第一批迁移建立了以下通用工程能力：

- **Backend**：FastAPI 服务，包含配置、日志、数据库 session、健康检查 API、用户模型和认证服务。
- **Frontend**：Next.js App Router 应用，包含 Tailwind CSS、shadcn/ui 基础组件、runtime config、API client。
- **Shared**：Python 共享包，包含日志、HTTP 工具、加密工具、OpenTelemetry 遥测。
- **OpenTelemetry**：Python 和前端 tracer，默认关闭，通过环境变量启用。
- **Docker**：MySQL、Redis、Backend、Frontend 四个核心服务的 compose 编排。
- **脚本**：`scripts/dev.sh`、`scripts/test.sh`、`scripts/format.sh`。

## 目录结构

```
agent_template/
├── backend/       # FastAPI API 服务
├── frontend/      # Next.js Web 应用
├── shared/        # Python 共享工具和遥测
├── telemetry/     # 可选 OpenTelemetry Collector 栈
├── observability/ # Sentry、Langfuse 自托管说明
├── scripts/       # 开发脚本
└── docs/          # 中英文文档
```

## 启动方式

```bash
# 1. 配置环境变量
cp .env.example .env

# 2. 启动基础设施
docker compose up -d mysql redis

# 3. 启动后端
cd backend && uv sync && uv run uvicorn app.main:app --reload

# 4. 启动前端
cd frontend && npm install && npm run dev
```

## 测试方式

```bash
# 运行所有测试
./scripts/test.sh

# 单独运行后端测试
cd backend && uv run pytest

# 单独运行 shared 测试
cd shared && uv run pytest

# 前端构建验证
cd frontend && npm run build
```
