# Agent Template

一个还没有 Agent 的 Agent Template——构建 LLM 应用的全栈脚手架，除了 Agent 本身，你需要的都准备好了。

**已包含：**

- **LLM 提供商与模型管理** — 支持多提供商（OpenAI 兼容、Anthropic），自动发现可用模型及元数据，连接测试，API 密钥加密存储
- **聊天驱动界面** — 多模式聊天面板（最小化 / 浮动 / 停靠），会话历史、消息线程、附件支持
- **圈选上下文** — 圈选页面任意区域，提取结构化数据：DOM 文本、表格数据、ECharts 图表序列、截图。提取的上下文作为附件发送给 Agent
- **认证系统** — JWT 认证，HttpOnly 刷新令牌 Cookie，基于角色的访问控制
- **可观测性** — OpenTelemetry 链路追踪、Sentry/GlitchTip 错误追踪、Langfuse LLM 可观测性，开箱即用
- **设计系统** — 温暖的奶油色画布配珊瑚色 CTA，衬线标题字体，响应式移动优先布局

**不包含：**

- Agent 本身。那是你的事。

基于 FastAPI、Next.js 15、TypeScript、Tailwind CSS、SQLAlchemy 和 Docker Compose 构建。

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
