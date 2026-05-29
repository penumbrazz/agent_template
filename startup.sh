#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[startup]${NC} $*"; }
warn() { echo -e "${YELLOW}[startup]${NC} $*"; }
die()  { echo -e "${RED}[startup]${NC} $*" >&2; exit 1; }

# Load .env if present
if [ -f .env ]; then
  set -a; source .env; set +a
  log "Loaded .env"
fi

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

check_deps() {
  for cmd in "$@"; do
    if ! command -v "$cmd" &>/dev/null; then
      die "$cmd is not installed. Please install it first."
    fi
  done
}

kill_port() {
  local port=$1
  local pids
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    warn "Port :$port is in use, killing existing processes ..."
    echo "$pids" | xargs kill 2>/dev/null || true
    sleep 1
  fi
}

start_backend() {
  kill_port "$BACKEND_PORT"
  log "Starting backend on :${BACKEND_PORT} ..."
  cd "$ROOT_DIR/backend"

  if [ ! -f .env ]; then
    warn "backend/.env not found, copying from .env.example"
    cp .env.example .env
  fi

  # Install deps if needed
  if [ ! -d ".venv" ]; then
    log "Installing backend dependencies ..."
    uv sync
  fi

  uv run uvicorn app.main:app \
    --host 0.0.0.0 \
    --port "$BACKEND_PORT" \
    --reload \
    &>/tmp/agent-template-backend.log &

  BACKEND_PID=$!
  # Track the process group so cleanup kills uvicorn's reload subprocesses too
  BACKEND_PGID=$(ps -o pgid= -p "$BACKEND_PID" | tr -d ' ')
  log "Backend PID: $BACKEND_PID (log: /tmp/agent-template-backend.log)"
}

start_frontend() {
  kill_port "$FRONTEND_PORT"
  log "Starting frontend on :${FRONTEND_PORT} ..."
  cd "$ROOT_DIR/frontend"

  if [ ! -d "node_modules" ]; then
    log "Installing frontend dependencies ..."
    npm install
  fi

  npm run dev \
    -- -p "$FRONTEND_PORT" \
    &>/tmp/agent-template-frontend.log &

  FRONTEND_PID=$!
  FRONTEND_PGID=$(ps -o pgid= -p "$FRONTEND_PID" | tr -d ' ')
  log "Frontend PID: $FRONTEND_PID (log: /tmp/agent-template-frontend.log)"
}

# --- Main ---
check_deps uv npm

start_backend
start_frontend

# Wait a moment then check processes are alive
sleep 2
if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
  die "Backend failed to start. Check /tmp/agent-template-backend.log"
fi
if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
  die "Frontend failed to start. Check /tmp/agent-template-frontend.log"
fi

echo ""
log "========================================="
log "  Backend  → http://localhost:${BACKEND_PORT}"
log "  Frontend → http://localhost:${FRONTEND_PORT}"
log "  API Docs → http://localhost:${BACKEND_PORT}/api/docs"
log "========================================="
echo ""
log "Press Ctrl+C to stop all services"

cleanup() {
  log "Stopping services ..."
  if [ -n "${BACKEND_PGID:-}" ]; then
    kill -- -"$BACKEND_PGID" 2>/dev/null || true
  else
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [ -n "${FRONTEND_PGID:-}" ]; then
    kill -- -"$FRONTEND_PGID" 2>/dev/null || true
  else
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  log "Done."
  exit 0
}
trap cleanup SIGINT SIGTERM

wait
