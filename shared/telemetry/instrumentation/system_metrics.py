# SPDX-FileCopyrightText: 2025 Weibo, Inc.
#
# SPDX-License-Identifier: Apache-2.0

"""System metrics OpenTelemetry instrumentation."""

import logging


def _setup_system_metrics_instrumentation(logger: logging.Logger) -> None:
    """Setup system metrics instrumentation for CPU, memory, etc."""
    try:
        from opentelemetry.instrumentation.system_metrics import (
            SystemMetricsInstrumentor,
        )

        SystemMetricsInstrumentor().instrument()
        logger.info("✓ System metrics instrumentation enabled")
    except ImportError:
        logger.debug(
            "System metrics instrumentation not available (package not installed)"
        )
    except Exception as e:
        logger.warning(f"Failed to setup System metrics instrumentation: {e}")
