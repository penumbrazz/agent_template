# SPDX-FileCopyrightText: 2025 Weibo, Inc.
#
# SPDX-License-Identifier: Apache-2.0

"""
OpenTelemetry instrumentation setup for all services.

This module provides auto-instrumentation for:
- FastAPI (HTTP requests/responses)
- SQLAlchemy (database queries) - optional
- Redis (cache operations) - optional
- HTTPX (async HTTP client)
- Requests (sync HTTP client)
- System metrics (CPU, memory, etc.)
"""

import logging
from typing import Any, Optional


def setup_opentelemetry_instrumentation(
    app: Any,
    logger: Optional[logging.Logger] = None,
    enable_sqlalchemy: bool = True,
    sqlalchemy_engine: Any = None,
    enable_redis: bool = True,
) -> None:
    """Setup OpenTelemetry instrumentation for a FastAPI service."""
    if logger is None:
        logger = logging.getLogger(__name__)

    from .fastapi import _setup_fastapi_instrumentation
    from .httpx import _setup_httpx_instrumentation
    from .redis import _setup_redis_instrumentation
    from .requests import _setup_requests_instrumentation
    from .sqlalchemy import _setup_sqlalchemy_instrumentation
    from .system_metrics import _setup_system_metrics_instrumentation

    _setup_fastapi_instrumentation(app, logger)

    if enable_sqlalchemy:
        _setup_sqlalchemy_instrumentation(logger, sqlalchemy_engine)

    if enable_redis:
        _setup_redis_instrumentation(logger)

    _setup_httpx_instrumentation(logger)
    _setup_requests_instrumentation(logger)
    _setup_system_metrics_instrumentation(logger)
