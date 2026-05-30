# SPDX-FileCopyrightText: 2025 Weibo, Inc.
#
# SPDX-License-Identifier: Apache-2.0

from typing import Any, Dict


def build_payload(**kwargs: Any) -> Dict[str, Any]:
    """Build a request payload by filtering out None values.

    Args:
        **kwargs: Keyword arguments to include in the payload.

    Returns:
        A dictionary containing only non-None key-value pairs.
    """
    return {k: v for k, v in kwargs.items() if v is not None}
