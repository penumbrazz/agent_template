"""HTTPX OpenTelemetry instrumentation."""
import logging
from typing import Any, Optional
from shared.telemetry.config import DEFAULT_MAX_BODY_SIZE
from shared.telemetry.context.large_data import log_json_body
def _setup_httpx_instrumentation(logger: logging.Logger) -> None:
    """Setup HTTPX instrumentation for tracing async HTTP client requests."""
    try:
        from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
        from shared.telemetry.config import get_http_capture_settings
        # Get HTTP capture settings
        capture_settings = get_http_capture_settings()
        # Build hooks for capturing request/response data
        # We need both sync and async hooks since OpenAI SDK uses async httpx
        request_hook = None
        response_hook = None
        async_request_hook = None
        async_response_hook = None
        if capture_settings.get("capture_request_headers") or capture_settings.get(
            "capture_request_body"
        ):
            request_hook = _create_httpx_request_hook(capture_settings, logger)
            async_request_hook = _create_httpx_async_request_hook(
                capture_settings, logger
            )
        if capture_settings.get("capture_response_headers") or capture_settings.get(
            "capture_response_body"
        ):
            response_hook = _create_httpx_response_hook(capture_settings, logger)
            async_response_hook = _create_httpx_async_response_hook(
                capture_settings, logger
            )
        HTTPXClientInstrumentor().instrument(
            request_hook=request_hook,
            response_hook=response_hook,
            async_request_hook=async_request_hook,
            async_response_hook=async_response_hook,
        )
        logger.info("✓ HTTPX instrumentation enabled")
        # Log capture settings
        if any(capture_settings.values()):
            enabled_captures = [k for k, v in capture_settings.items() if v]
            logger.info(f"  HTTPX capture enabled for: {', '.join(enabled_captures)}")
    except ImportError:
        logger.debug("HTTPX instrumentation not available (package not installed)")
    except Exception as e:
        logger.warning(f"Failed to setup HTTPX instrumentation: {e}")
def _create_httpx_request_hook(capture_settings: dict, logger: logging.Logger):
    """Create a request hook for HTTPX client to capture request headers and body."""
    def request_hook(span, request):
        """Hook called when an HTTPX request is made."""
        if span is None or not span.is_recording():
            return
        try:
            # Capture request headers
            if capture_settings.get("capture_request_headers"):
                for header_name, header_value in request.headers.items():
                    # Skip sensitive headers
                    if header_name.lower() in ("authorization", "cookie", "set-cookie"):
                        header_value = "[REDACTED]"
                    span.set_attribute(
                        f"http.request.header.{header_name}", header_value
                    )
            # Capture request body
            if capture_settings.get("capture_request_body"):
                try:
                    # HTTPX request body is in request.content
                    if hasattr(request, "content") and request.content:
                        body = request.content
                        log_json_body("http.request.body", body)
                except Exception as e:
                    logger.debug(f"Failed to capture HTTPX request body: {e}")
        except Exception as e:
            logger.debug(f"Error in HTTPX request_hook: {e}")
    return request_hook
def _create_httpx_response_hook(capture_settings: dict, logger: logging.Logger):
    """Create a response hook for HTTPX client to capture response headers and body."""
    def response_hook(span, request, response):
        """Hook called when an HTTPX response is received."""
        if span is None or not span.is_recording():
            return
        try:
            # Capture response headers
            if capture_settings.get("capture_response_headers"):
                for header_name, header_value in response.headers.items():
                    # Skip sensitive headers
                    if header_name.lower() in ("authorization", "cookie", "set-cookie"):
                        header_value = "[REDACTED]"
                    span.set_attribute(
                        f"http.response.header.{header_name}", header_value
                    )
            # Capture response body
            if capture_settings.get("capture_response_body"):
                try:
                    # HTTPX response body is in response.content
                    if hasattr(response, "content") and response.content:
                        body = response.content
                        log_json_body("http.response.body", body)
                except Exception as e:
                    logger.debug(f"Failed to capture HTTPX response body: {e}")
        except Exception as e:
            logger.debug(f"Error in HTTPX response_hook: {e}")
    return response_hook
def _extract_httpx_request_body(
    request: Any, logger: logging.Logger
) -> Optional[bytes]:
    """Try multiple methods to extract the body from an HTTPX request object.
    Args:
        request: The HTTPX request object.
        logger: Logger instance for debug output.
    Returns:
        The request body as bytes, or None if extraction failed.
    """
    body = None
    # Method 1: request.content (bytes) - most common
    if hasattr(request, "content"):
        content = request.content
        content_preview = content[:100] if content else b"empty"
        logger.debug(
            f"[OTEL DEBUG] request.content type: {type(content)}, "
            f"len: {len(content) if content else 0}, preview: {content_preview}"
        )
        if content:
            body = content
    # Method 2: request.stream (for streaming requests)
    if body is None and hasattr(request, "stream"):
        stream = request.stream
        stream_attrs = [attr for attr in dir(stream) if not attr.startswith("__")]
        logger.debug(
            f"[OTEL DEBUG] request.stream type: {type(stream).__name__}, "
            f"attrs: {stream_attrs[:10]}"
        )
        # Try _stream first (ByteStream uses this)
        if hasattr(stream, "_stream"):
            inner_stream = stream._stream
            logger.debug(f"[OTEL DEBUG] Found stream._stream: {type(inner_stream)}")
            if isinstance(inner_stream, bytes):
                body = inner_stream
                logger.debug(f"[OTEL DEBUG] _stream is bytes, len: {len(body)}")
            elif hasattr(inner_stream, "read"):
                # It's a file-like object (BytesIO), try to read and reset
                try:
                    current_pos = (
                        inner_stream.tell() if hasattr(inner_stream, "tell") else 0
                    )
                    body = inner_stream.read()
                    if hasattr(inner_stream, "seek"):
                        inner_stream.seek(current_pos)
                    logger.debug(
                        f"[OTEL DEBUG] Read from _stream: {type(body)}, "
                        f"len: {len(body) if body else 0}"
                    )
                except Exception as read_err:
                    logger.debug(f"[OTEL DEBUG] _stream read failed: {read_err}")
        # Fallback to _content
        elif hasattr(stream, "_content") and stream._content:
            body = stream._content
            logger.debug(
                f"[OTEL DEBUG] Found stream._content: {type(body)}, "
                f"len: {len(body) if body else 0}"
            )
        elif hasattr(stream, "body") and stream.body:
            body = stream.body
            logger.debug(f"[OTEL DEBUG] Found stream.body: {type(body)}")
        elif hasattr(stream, "_body") and stream._body:
            body = stream._body
            logger.debug(f"[OTEL DEBUG] Found stream._body: {type(body)}")
    # Method 3: Check if request has _content attribute
    if body is None and hasattr(request, "_content"):
        body = request._content
        logger.debug(f"[OTEL DEBUG] Found request._content: {type(body)}")
    # Method 4: Try to read from stream if it's a ByteStream
    if body is None and hasattr(request, "stream"):
        stream = request.stream
        stream_type = type(stream).__name__
        logger.debug(f"[OTEL DEBUG] Stream type name: {stream_type}")
        # For ByteStream, try to get the underlying bytes
        if hasattr(stream, "__iter__"):
            # Don't consume the iterator, just log that it exists
            logger.info(
                "[OTEL DEBUG] Stream is iterable, cannot capture without consuming"
            )
    return body
def _create_httpx_async_request_hook(capture_settings: dict, logger: logging.Logger):
    """Create an async request hook for HTTPX client to capture request headers and body."""
    async def async_request_hook(span, request):
        """Async hook called when an HTTPX request is made."""
        if span is None or not span.is_recording():
            return
        try:
            # Capture request headers
            if capture_settings.get("capture_request_headers"):
                for header_name, header_value in request.headers.items():
                    # Skip sensitive headers
                    if header_name.lower() in ("authorization", "cookie", "set-cookie"):
                        header_value = "[REDACTED]"
                    span.set_attribute(
                        f"http.request.header.{header_name}", header_value
                    )
            # Capture request body
            if capture_settings.get("capture_request_body"):
                try:
                    # Debug: Log request object attributes (use INFO level for visibility)
                    request_attrs = [
                        attr for attr in dir(request) if not attr.startswith("_")
                    ]
                    logger.debug(
                        f"[OTEL DEBUG] HTTPX request type: {type(request).__name__}, attrs: {request_attrs[:10]}..."
                    )
                    body = _extract_httpx_request_body(request, logger)
                    if body:
                        log_json_body("http.request.body", body)
                        logger.debug(
                            f"[OTEL DEBUG] Captured request body: "
                            f"{len(body) if isinstance(body, (bytes, str)) else 'unknown'} bytes/chars"
                        )
                    else:
                        logger.info("[OTEL DEBUG] No request body found to capture")
                except Exception as e:
                    logger.warning(
                        f"[OTEL DEBUG] Failed to capture HTTPX async request body: {e}"
                    )
        except Exception as e:
            logger.debug(f"Error in HTTPX async_request_hook: {e}")
    return async_request_hook
def _create_httpx_async_response_hook(capture_settings: dict, logger: logging.Logger):
    """Create an async response hook for HTTPX client to capture response headers and body."""
    async def async_response_hook(span, request, response):
        """Async hook called when an HTTPX response is received."""
        if span is None or not span.is_recording():
            return
        try:
            # Capture response headers
            if capture_settings.get("capture_response_headers"):
                for header_name, header_value in response.headers.items():
                    # Skip sensitive headers
                    if header_name.lower() in ("authorization", "cookie", "set-cookie"):
                        header_value = "[REDACTED]"
                    span.set_attribute(
                        f"http.response.header.{header_name}", header_value
                    )
            # Capture response body
            if capture_settings.get("capture_response_body"):
                try:
                    # For async responses, we need to read the content
                    # Note: This may not work for streaming responses
                    if hasattr(response, "content") and response.content:
                        body = response.content
                        log_json_body("http.response.body", body)
                except Exception as e:
                    logger.debug(f"Failed to capture HTTPX async response body: {e}")
        except Exception as e:
            logger.debug(f"Error in HTTPX async_response_hook: {e}")
    return async_response_hook
