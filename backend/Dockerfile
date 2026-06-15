FROM python:3.12-slim

WORKDIR /app

# Install uv
RUN pip install uv

# Copy shared package first for caching. Place it at /app/shared so the
# backend's editable install ([tool.uv.sources] agent-template-shared = "../shared",
# resolved relative to /app/backend => /app/shared) finds the package.
COPY shared /app/shared
WORKDIR /app/shared
RUN uv sync --no-dev

# Copy backend
WORKDIR /app
COPY backend/pyproject.toml backend/
WORKDIR /app/backend
RUN uv sync --no-dev

COPY backend/ .
RUN chmod +x entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
