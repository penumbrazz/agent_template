#!/bin/bash
set -e

# Use a fixed advisory lock so only one replica runs migrations at a time.
# The lock is session-scoped: released automatically when the holder exits,
# so waiting replicas proceed immediately afterwards.
# Lock id 1096410093 == 0x414C454D ("ALEM" in big-endian hex).
ALEMBIC_ADVISORY_LOCK_ID=1096410093

echo "Running database migrations under advisory lock..."
uv run python - "$ALEMBIC_ADVISORY_LOCK_ID" <<'PY'
import subprocess
import sys

from sqlalchemy import text

from app.db.session import engine

lock_id = int(sys.argv[1])
# Open a dedicated connection that holds the advisory lock for the whole
# migration. The lock is released when this connection closes (process exit).
conn = engine.connect()
conn.execute(text("SELECT pg_advisory_lock(:lid)"), {"lid": lock_id})
conn.commit()
print(f"Acquired advisory lock {lock_id}", flush=True)
try:
    rc = subprocess.call(["uv", "run", "alembic", "upgrade", "head"])
    if rc != 0:
        sys.exit(rc)
finally:
    conn.execute(text("SELECT pg_advisory_unlock(:lid)"), {"lid": lock_id})
    conn.commit()
    conn.close()
    print(f"Released advisory lock {lock_id}", flush=True)
PY

exec "$@"
