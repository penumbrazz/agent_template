# Agent Template

A full-stack AI application template with FastAPI backend, Next.js frontend, shared Python package, OpenTelemetry, Docker Compose, local development scripts, and test scaffolding.

> **Disclaimer:** Despite the name "Agent Template," this project does not actually implement any Agent functionality yet. It is a well-structured full-stack template with LLM provider management, model configuration, and a chat UI — but the Agent part is left as an exercise for the user. Consider it an Agent Template without the Agent.

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
