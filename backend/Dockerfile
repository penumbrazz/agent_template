FROM python:3.12-slim

WORKDIR /app

# Install uv
RUN pip install uv

# Copy shared package first for caching
COPY shared /shared
WORKDIR /shared
RUN uv sync --no-dev

# Copy backend
WORKDIR /app
COPY backend/pyproject.toml backend/
WORKDIR /app/backend
RUN uv sync --no-dev

COPY backend/ .

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
