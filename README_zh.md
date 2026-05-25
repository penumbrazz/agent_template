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
# 确保 PostgreSQL 和 Redis 已运行，然后：
cd backend && uv sync && uv run pytest
cd ../frontend && npm install && npm test
```
