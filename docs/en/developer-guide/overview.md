---
sidebar_position: 1
---

# Engineering Foundation Overview

## Phase 1 Foundation

The first migration batch established the following common engineering capabilities:

- **Backend**: FastAPI service with configuration, logging, database session, health check API, user model, and authentication service.
- **Frontend**: Next.js App Router application with Tailwind CSS, shadcn/ui base components, runtime config, and API client.
- **Shared**: Python shared package with logging, HTTP utilities, cryptography utilities, and OpenTelemetry telemetry.
- **OpenTelemetry**: Python and frontend tracers, disabled by default, enabled via environment variables.
- **Docker**: MySQL, Redis, Backend, Frontend core service compose orchestration.
- **Scripts**: `scripts/dev.sh`, `scripts/test.sh`, `scripts/format.sh`.

## Directory Structure

```
agent_template/
├── backend/       # FastAPI API service
├── frontend/      # Next.js web application
├── shared/        # Python shared utilities and telemetry
├── telemetry/     # Optional OpenTelemetry Collector stack
├── observability/ # Sentry, Langfuse self-hosted instructions
├── scripts/       # Development scripts
└── docs/          # Chinese and English documentation
```

## Getting Started

```bash
# 1. Configure environment
cp .env.example .env

# 2. Start infrastructure
docker compose up -d mysql redis

# 3. Start backend
cd backend && uv sync && uv run uvicorn app.main:app --reload

# 4. Start frontend
cd frontend && npm install && npm run dev
```

## Running Tests

```bash
# Run all tests
./scripts/test.sh

# Backend tests only
cd backend && uv run pytest

# Shared tests only
cd shared && uv run pytest

# Frontend build verification
cd frontend && npm run build
```
