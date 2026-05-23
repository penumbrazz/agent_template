#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR/shared"
uv run black .
uv run isort .

cd "$ROOT_DIR/backend"
uv run black .
uv run isort .

cd "$ROOT_DIR/frontend"
npm run format
