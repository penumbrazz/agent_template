"""Requests (sync HTTP client) OpenTelemetry instrumentation."""
import logging
from shared.telemetry.context.large_data import log_json_body
def _setup_requests_instrumentation(logger: logging.Logger) -> None:
    """Setup Requests instrumentation for tracing sync HTTP client requests."""
    try:
        from opentelemetry.instrumentation.requests import RequestsInstrumentor
        from shared.telemetry.config import get_http_capture_settings
        # Get HTTP capture settings
        capture_settings = get_http_capture_settings()
        # Build hooks for capturing request/response data
        request_hook = None
        response_hook = None
        if capture_settings.get("capture_request_headers") or capture_settings.get(
            "capture_request_body"
        ):
            request_hook = _create_requests_request_hook(capture_settings, logger)
        if capture_settings.get("capture_response_headers") or capture_settings.get(
            "capture_response_body"
        ):
            response_hook = _create_requests_response_hook(capture_settings, logger)
        RequestsInstrumentor().instrument(
            request_hook=request_hook,
            response_hook=response_hook,
        )
        logger.info("✓ Requests instrumentation enabled")
        # Log capture settings
        if any(capture_settings.values()):
            enabled_captures = [k for k, v in capture_settings.items() if v]
            logger.info(
                f"  Requests capture enabled for: {', '.join(enabled_captures)}"
            )
    except ImportError:
        logger.debug("Requests instrumentation not available (package not installed)")
    except Exception as e:
        logger.warning(f"Failed to setup Requests instrumentation: {e}")
def _create_requests_request_hook(capture_settings: dict, logger: logging.Logger):
    """Create a request hook for Requests library to capture request headers and body."""
    def request_hook(span, request):
        """Hook called when a Requests request is made."""
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
                    # Requests body is in request.body
                    if hasattr(request, "body") and request.body:
                        body = request.body
                        log_json_body("http.request.body", body)
                except Exception as e:
                    logger.debug(f"Failed to capture Requests request body: {e}")
        except Exception as e:
            logger.debug(f"Error in Requests request_hook: {e}")
    return request_hook
def _create_requests_response_hook(capture_settings: dict, logger: logging.Logger):
    """Create a response hook for Requests library to capture response headers and body."""
    def response_hook(span, request, response):
        """Hook called when a Requests response is received."""
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
                    # Requests response body is in response.content or response.text
                    if hasattr(response, "content") and response.content:
                        body = response.content
                        log_json_body("http.response.body", body)
                except Exception as e:
                    logger.debug(f"Failed to capture Requests response body: {e}")
        except Exception as e:
            logger.debug(f"Error in Requests response_hook: {e}")
    return response_hook
