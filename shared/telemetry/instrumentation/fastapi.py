"""FastAPI OpenTelemetry instrumentation."""

import logging
from typing import Any

from shared.telemetry.config import DEFAULT_MAX_BODY_SIZE


def _build_fastapi_hooks(capture_settings: dict, logger: logging.Logger) -> dict:
    """Build request/response hooks for FastAPI instrumentation.
    Args:
        capture_settings: HTTP capture configuration dict.
        logger: Logger instance.
    Returns:
        Dict with server_request_hook, client_request_hook, client_response_hook.
    """
    server_request_hook = None
    client_request_hook = None
    client_response_hook = None
    if capture_settings.get("capture_request_headers") or capture_settings.get(
        "capture_request_body"
    ):
        server_request_hook = _create_server_request_hook(capture_settings, logger)
    if capture_settings.get("capture_response_headers") or capture_settings.get(
        "capture_response_body"
    ):
        client_response_hook = _create_client_response_hook(capture_settings, logger)
    return {
        "server_request_hook": server_request_hook,
        "client_request_hook": client_request_hook,
        "client_response_hook": client_response_hook,
    }


def _apply_fastapi_instrumentation(
    app: Any,
    instrument_kwargs: dict,
    disable_send_receive: bool,
    logger: logging.Logger,
) -> None:
    """Apply FastAPI instrumentation with fallback for unsupported options.
    Args:
        app: FastAPI application instance.
        instrument_kwargs: Keyword arguments for instrument_app.
        disable_send_receive: Whether send/receive span exclusion was requested.
        logger: Logger instance.
    """
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

    try:
        FastAPIInstrumentor.instrument_app(app, **instrument_kwargs)
        logger.info("✓ FastAPI instrumentation enabled")
    except TypeError as e:
        # If exclude_spans is not supported, retry without it
        if "exclude_spans" in str(e) and disable_send_receive:
            logger.warning(
                "  exclude_spans not supported in this version. "
                "Upgrade opentelemetry-instrumentation-fastapi to disable "
                "internal http.send/http.receive spans for streaming endpoints."
            )
            del instrument_kwargs["exclude_spans"]
            FastAPIInstrumentor.instrument_app(app, **instrument_kwargs)
            logger.info(
                "✓ FastAPI instrumentation enabled (without streaming optimization)"
            )
        else:
            raise


def _log_fastapi_instrumentation_config(
    capture_settings: dict, otel_config: Any, logger: logging.Logger
) -> None:
    """Log the FastAPI instrumentation configuration.
    Args:
        capture_settings: HTTP capture configuration dict.
        otel_config: OTEL configuration object.
        logger: Logger instance.
    """
    if any(capture_settings.values()):
        enabled_captures = [k for k, v in capture_settings.items() if v]
        logger.info(f"  HTTP capture enabled for: {', '.join(enabled_captures)}")
    if otel_config.included_urls:
        logger.info(f"  URL whitelist mode: {otel_config.included_urls}")
    elif otel_config.excluded_urls:
        logger.info(f"  URL blacklist: {otel_config.excluded_urls}")


def _setup_fastapi_instrumentation(app: Any, logger: logging.Logger) -> None:
    """Setup FastAPI instrumentation for tracing HTTP requests.
    Industry Standard for SSE/Streaming:
    ------------------------------------
    By default, OpenTelemetry ASGI instrumentation creates internal spans for each
    http.send and http.receive event. For SSE/streaming endpoints like /api/chat/stream,
    this creates excessive noise as each chunk generates a separate span.
    Industry Standard Solutions:
    1. Use `excluded_urls` to skip tracing for streaming endpoints entirely
    2. Use custom ASGI middleware with `exclude_send_receive_spans=True` (ASGI >= 0.45b0)
    3. Configure sampling to reduce the volume of these spans
    We implement option 2 when available, with automatic fallback behavior.
    References:
    - OpenTelemetry ASGI Instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/asgi/asgi.html
    - GitHub Issue: https://github.com/open-telemetry/opentelemetry-python-contrib/issues/1075
    - Semantic Conventions: https://opentelemetry.io/docs/specs/semconv/http/
    """
    try:
        from shared.telemetry.config import (
            get_excluded_urls_regex,
            get_http_capture_settings,
            get_otel_config,
        )

        # Get HTTP capture settings
        capture_settings = get_http_capture_settings()
        # Get URL filtering configuration
        otel_config = get_otel_config()
        excluded_urls_regex = get_excluded_urls_regex()
        # Build hooks for capturing request/response data
        instrument_kwargs = _build_fastapi_hooks(capture_settings, logger)
        # Add excluded_urls if configured (blacklist mode)
        if excluded_urls_regex and not otel_config.included_urls:
            instrument_kwargs["excluded_urls"] = excluded_urls_regex
            logger.info(
                f"  URL blacklist enabled: {len(otel_config.excluded_urls)} patterns"
            )
        # Disable internal http.send/http.receive spans if configured
        # This is the industry standard approach to reduce noise from SSE/streaming endpoints
        # where each chunk would otherwise create a separate span
        if otel_config.disable_send_receive_spans:
            instrument_kwargs["exclude_spans"] = "send,receive"
            logger.info(
                "  Internal http.send/http.receive spans disabled (streaming-friendly mode)"
            )
        _apply_fastapi_instrumentation(
            app, instrument_kwargs, otel_config.disable_send_receive_spans, logger
        )
        _log_fastapi_instrumentation_config(capture_settings, otel_config, logger)
    except ImportError:
        logger.debug("FastAPI instrumentation not available (package not installed)")
    except Exception as e:
        logger.warning(f"Failed to setup FastAPI instrumentation: {e}")


def _create_server_request_hook(capture_settings: dict, logger: logging.Logger):
    """Create a server request hook for capturing request headers, query params, and body."""

    def server_request_hook(span, scope):
        """Hook called when a request is received."""
        if span is None or not span.is_recording():
            return
        try:
            # Capture request headers
            if capture_settings.get("capture_request_headers"):
                headers = scope.get("headers", [])
                for header_name, header_value in headers:
                    # Decode bytes to string
                    name = (
                        header_name.decode("utf-8")
                        if isinstance(header_name, bytes)
                        else header_name
                    )
                    value = (
                        header_value.decode("utf-8")
                        if isinstance(header_value, bytes)
                        else header_value
                    )
                    # Skip sensitive headers
                    if name.lower() in ("authorization", "cookie", "set-cookie"):
                        value = "[REDACTED]"
                    span.set_attribute(f"http.request.header.{name}", value)
            # Capture query parameters
            if capture_settings.get("capture_request_body"):
                query_string = scope.get("query_string", b"")
                if query_string:
                    if isinstance(query_string, bytes):
                        query_string = query_string.decode("utf-8", errors="replace")
                    span.set_attribute("http.request.query_string", query_string)
                    # Parse query parameters into individual attributes
                    try:
                        from urllib.parse import parse_qs

                        params = parse_qs(query_string)
                        for key, values in params.items():
                            # Join multiple values with comma
                            value = ",".join(values)
                            # Redact sensitive parameters
                            if key.lower() in (
                                "password",
                                "token",
                                "api_key",
                                "apikey",
                                "secret",
                                "access_token",
                            ):
                                value = "[REDACTED]"
                            span.set_attribute(f"http.request.param.{key}", value)
                    except Exception:
                        pass  # If parsing fails, we still have the raw query_string
                # Capture path parameters from scope
                path_params = scope.get("path_params", {})
                if path_params:
                    for key, value in path_params.items():
                        span.set_attribute(f"http.request.path_param.{key}", str(value))
        except Exception as e:
            logger.debug(f"Error in server_request_hook: {e}")

    return server_request_hook


def _create_client_response_hook(capture_settings: dict, logger: logging.Logger):
    """Create a client response hook for capturing response headers and body."""

    def client_response_hook(span, message):
        """Hook called when a response is sent."""
        if span is None or not span.is_recording():
            return
        try:
            # Capture response headers
            if capture_settings.get("capture_response_headers"):
                headers = message.get("headers", [])
                for header_name, header_value in headers:
                    # Decode bytes to string
                    name = (
                        header_name.decode("utf-8")
                        if isinstance(header_name, bytes)
                        else header_name
                    )
                    value = (
                        header_value.decode("utf-8")
                        if isinstance(header_value, bytes)
                        else header_value
                    )
                    # Skip sensitive headers
                    if name.lower() in ("authorization", "cookie", "set-cookie"):
                        value = "[REDACTED]"
                    span.set_attribute(f"http.response.header.{name}", value)
            # Capture response body (be careful with large bodies)
            if capture_settings.get("capture_response_body"):
                body = message.get("body", b"")
                if body:
                    # Limit body size to avoid huge spans
                    max_body_size = DEFAULT_MAX_BODY_SIZE
                    if isinstance(body, bytes):
                        body_str = body[:max_body_size].decode(
                            "utf-8", errors="replace"
                        )
                    else:
                        body_str = str(body)[:max_body_size]
                    if len(body) > max_body_size:
                        body_str += f"... [truncated, total size: {len(body)} bytes]"
                    span.set_attribute("http.response.body", body_str)
        except Exception as e:
            logger.debug(f"Error in client_response_hook: {e}")

    return client_response_hook
