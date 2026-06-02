# Agent Template

An Agent Template that doesn't have Agent yet — a full-stack scaffolding for building LLM-powered applications, with everything you need except the actual agent logic.

**What's included:**

- **LLM Provider & Model Management** — Multi-provider support (OpenAI-compatible, Anthropic), auto-discovery of available models with metadata, connection testing, and credential encryption at rest
- **Chat-Driven UI** — Multi-mode chat panel (minimized / floating / docked) with session history, message threads, and attachment support
- **Selection Context** — Lasso any region on the page and extract structured artifacts: DOM text, table data, ECharts chart series, or screenshots. Extracted context attaches to chat messages as input for the agent
- **Auth** — JWT authentication with HttpOnly refresh-token cookies, role-based access control
- **Observability** — OpenTelemetry tracing, Sentry/GlitchTip error tracking, Langfuse LLM observability, all instrumented out of the box
- **Design System** — Warm cream canvas with coral CTAs, slab-serif headlines, responsive mobile-first layout

**What's NOT included:**

- The actual Agent. That's your job.

Built with FastAPI, Next.js 15, TypeScript, Tailwind CSS, SQLAlchemy, and Docker Compose.

## Modules

- `backend`: FastAPI API service
- `frontend`: Next.js web application
- `shared`: Python shared utilities and telemetry
- `telemetry`: OpenTelemetry Collector, Jaeger, Elasticsearch, Kibana optional observability stack
- `observability`: GlitchTip and Langfuse self-hosted instructions

## Quick Start

```bash
cp .env.example .env
# Ensure PostgreSQL and Redis are running, then:
cd backend && uv sync && uv run pytest
cd ../frontend && npm install && npm test
```
