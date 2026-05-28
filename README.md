# Agent Template

A full-stack AI application template with FastAPI backend, Next.js frontend, shared Python package, OpenTelemetry, Docker Compose, local development scripts, and test scaffolding.

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
