#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"
black backend shared
isort backend shared

cd "$ROOT_DIR/frontend"
npm run format
