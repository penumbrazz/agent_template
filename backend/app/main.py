from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.router import api_router
from app.core.config import settings
from app.core.error_tracking import init_error_tracking
from app.core.langfuse import init_langfuse, shutdown_langfuse
from app.core.logging import setup_logging
from app.core.rate_limit import limiter
from app.db.seed import seed_default_admin
from app.db.session import SessionLocal


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown lifecycle."""
    setup_logging()
    # Seed default admin user
    db = SessionLocal()
    try:
        seed_default_admin(db)
    finally:
        db.close()
    init_error_tracking()
    langfuse = init_langfuse()
    if langfuse:
        structlog.get_logger("langfuse").info(
            "langfuse_connected", host=settings.LANGFUSE_HOST
        )
    yield
    # Shutdown: close shared async http client
    from app.services.provider import close_http_client

    await close_http_client()
    shutdown_langfuse()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""
    openapi_url = (
        f"{settings.API_PREFIX}/openapi.json" if settings.ENABLE_API_DOCS else None
    )
    docs_url = f"{settings.API_PREFIX}/docs" if settings.ENABLE_API_DOCS else None

    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url=openapi_url,
        docs_url=docs_url,
        lifespan=lifespan,
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    app.include_router(api_router, prefix=settings.API_PREFIX)

    from shared.telemetry.config import get_otel_config

    otel_config = get_otel_config("agent-template-backend")
    if otel_config.enabled:
        try:
            from shared.telemetry.core import init_telemetry
            from shared.telemetry.instrumentation import (
                setup_opentelemetry_instrumentation,
            )

            init_telemetry(
                service_name=otel_config.service_name,
                enabled=otel_config.enabled,
                otlp_endpoint=otel_config.otlp_endpoint,
                sampler_ratio=otel_config.sampler_ratio,
                service_version=settings.VERSION,
                deployment_environment=settings.ENVIRONMENT,
                metrics_enabled=otel_config.metrics_enabled,
                capture_request_headers=otel_config.capture_request_headers,
                capture_request_body=otel_config.capture_request_body,
                capture_response_headers=otel_config.capture_response_headers,
                capture_response_body=otel_config.capture_response_body,
                max_body_size=otel_config.max_body_size,
            )
            setup_opentelemetry_instrumentation(app=app, enable_sqlalchemy=False)
        except Exception:
            structlog.get_logger("otel").warning("otel_init_failed", exc_info=True)

    return app


app = create_app()
