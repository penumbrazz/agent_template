#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR/shared"
uv run pytest

cd "$ROOT_DIR/backend"
uv run pytest

cd "$ROOT_DIR/frontend"
npm test -- --watch=false --passWithNoTests
