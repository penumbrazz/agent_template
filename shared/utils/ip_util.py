"""
Utility functions for retrieving host IP address.

Provides a cached IP address lookup for use in telemetry span attributes.
"""

import socket
from typing import Optional

_cached_ip: Optional[str] = None


def get_host_ip() -> str:
    """Return the host IP address, with caching for performance.

    Uses a UDP socket connection to determine the local IP address.
    Falls back to '127.0.0.1' if the lookup fails.

    Returns:
        The host IP address as a string.
    """
    global _cached_ip
    if _cached_ip is not None:
        return _cached_ip
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        _cached_ip = s.getsockname()[0]
        s.close()
    except Exception:
        _cached_ip = "127.0.0.1"
    return _cached_ip
