import structlog
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.langfuse import init_langfuse, shutdown_langfuse
from app.core.logging import setup_logging
from app.core.error_tracking import init_error_tracking


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    init_error_tracking()
    langfuse = init_langfuse()
    if langfuse:
        structlog.get_logger("langfuse").info("langfuse_connected", host=settings.LANGFUSE_HOST)
    yield
    shutdown_langfuse()


def create_app() -> FastAPI:
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

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
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
            pass

    return app


app = create_app()
