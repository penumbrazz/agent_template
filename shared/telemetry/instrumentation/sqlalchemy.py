# SPDX-FileCopyrightText: 2025 Weibo, Inc.
#
# SPDX-License-Identifier: Apache-2.0

"""SQLAlchemy OpenTelemetry instrumentation."""

import logging
from typing import Any


def _setup_sqlalchemy_instrumentation(
    logger: logging.Logger, engine: Any = None
) -> None:
    """Setup SQLAlchemy instrumentation for tracing database queries."""
    try:
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

        if engine is None:
            logger.warning(
                "SQLAlchemy instrumentation requested but no engine provided"
            )
            return

        # Handle async engine by getting sync_engine
        actual_engine = getattr(engine, "sync_engine", engine)
        SQLAlchemyInstrumentor().instrument(engine=actual_engine)
        logger.info("✓ SQLAlchemy instrumentation enabled")
    except ImportError:
        logger.debug("SQLAlchemy instrumentation not available (package not installed)")
    except Exception as e:
        logger.warning(f"Failed to setup SQLAlchemy instrumentation: {e}")
