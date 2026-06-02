# Agent Template

全栈 AI 应用模板，包含 FastAPI 后端、Next.js 前端、共享 Python 包、OpenTelemetry、Docker Compose、本地开发脚本和测试骨架。

> **免责声明：** 虽然名字叫"Agent Template"，但这个项目实际上还没有实现任何 Agent 功能。它是一个结构完善的全栈模板，包含 LLM 提供商管理、模型配置和聊天界面——但 Agent 部分留给了使用者自己去实现。你可以把它理解为一个没有 Agent 的 Agent 模板。

## 模块

- `backend`: FastAPI API 服务
- `frontend`: Next.js Web 应用
- `shared`: Python 共享工具和遥测
- `telemetry`: OpenTelemetry Collector、Jaeger、Elasticsearch、Kibana 可选观测栈
- `observability`: GlitchTip 和 Langfuse 自托管说明

## 快速开始

```bash
cp .env.example .env
# 确保 PostgreSQL 和 Redis 已运行，然后：
cd backend && uv sync && uv run pytest
cd ../frontend && npm install && npm test
```
