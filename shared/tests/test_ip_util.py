"""Tests for the host IP utility.

``get_host_ip`` determines the local IP via a UDP ``connect`` trick and caches
the result in a module global. We exercise the happy path, the exception
fallback, and the caching behaviour using socket mocking.
"""

import socket
from unittest import mock

import pytest

import shared.utils.ip_util as ip_util


@pytest.fixture(autouse=True)
def _reset_cache() -> None:
    """Clear the module-level cache before each test."""
    ip_util._cached_ip = None


class _FakeSocket:
    """Minimal stand-in for a UDP socket used by ``get_host_ip``."""

    def __init__(self, ip: str = "192.168.1.10") -> None:
        self._ip = ip
        self.connected: list[tuple[str, int]] = []
        self.closed = False

    def connect(self, addr: tuple[str, int]) -> None:
        self.connected.append(addr)

    def getsockname(self) -> tuple[str, int]:
        return (self._ip, 12345)

    def close(self) -> None:
        self.closed = True


def test_get_host_ip_returns_detected_ip() -> None:
    fake = _FakeSocket(ip="10.0.0.5")
    with mock.patch.object(socket, "socket", return_value=fake):
        result = ip_util.get_host_ip()
    assert result == "10.0.0.5"
    # The probe should target 8.8.8.8:80
    assert fake.connected == [("8.8.8.8", 80)]
    assert fake.closed is True


def test_get_host_ip_falls_back_on_exception() -> None:
    def _boom(*_args, **_kwargs):
        raise OSError("network unavailable")

    with mock.patch.object(socket, "socket", side_effect=_boom):
        result = ip_util.get_host_ip()
    assert result == "127.0.0.1"


def test_get_host_ip_caches_result() -> None:
    fake = _FakeSocket(ip="172.16.0.7")
    call_count = 0

    def _factory(*_args, **_kwargs):
        nonlocal call_count
        call_count += 1
        return fake

    with mock.patch.object(socket, "socket", side_effect=_factory):
        first = ip_util.get_host_ip()
        second = ip_util.get_host_ip()

    assert first == "172.16.0.7"
    assert second == "172.16.0.7"
    # Socket must only be created once thanks to the cache.
    assert call_count == 1


def test_get_host_ip_caches_fallback() -> None:
    """If the first call fails, the fallback is also cached."""
    call_count = 0

    def _factory(*_args, **_kwargs):
        nonlocal call_count
        call_count += 1
        raise OSError("nope")

    with mock.patch.object(socket, "socket", side_effect=_factory):
        assert ip_util.get_host_ip() == "127.0.0.1"
        # Cached: no further socket creation.
        assert ip_util.get_host_ip() == "127.0.0.1"
    assert call_count == 1


def test_get_host_ip_falls_back_when_getsockname_raises() -> None:
    """If socket creation succeeds but getsockname fails, still fall back."""

    class _BadSocket(_FakeSocket):
        def getsockname(self):
            raise RuntimeError("unexpected")

    fake = _BadSocket()
    with mock.patch.object(socket, "socket", return_value=fake):
        result = ip_util.get_host_ip()
    assert result == "127.0.0.1"
