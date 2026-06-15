from unittest.mock import MagicMock

import pytest

from app.core import rate_limit as rate_limit_module
from app.core.config import Settings


def _make_request(xff=None, peer="9.8.7.6"):
    """Build a request-like mock with a configurable XFF header and peer."""
    request = MagicMock()
    if xff is None:
        request.headers.get.return_value = None
    else:
        request.headers.get.return_value = xff
    if peer is None:
        request.client = None
    else:
        request.client = MagicMock()
        request.client.host = peer
    return request


@pytest.fixture
def trusted_hops(monkeypatch):
    """Patch TRUSTED_PROXY_HOPS on the settings instance imported by rate_limit."""

    def _set(value: int):
        monkeypatch.setattr(
            rate_limit_module.settings, "TRUSTED_PROXY_HOPS", value, raising=True
        )

    return _set


class TestGetClientIpNoTrustedProxy:
    """TRUSTED_PROXY_HOPS == 0 (default): XFF must NEVER be trusted."""

    def test_xff_is_ignored_uses_peer(self, trusted_hops):
        trusted_hops(0)
        request = _make_request(xff="1.2.3.4", peer="9.8.7.6")
        assert rate_limit_module._get_client_ip(request) == "9.8.7.6"

    def test_spoofed_xff_does_not_move_counter(self, trusted_hops):
        # Regression for the XFF-spoofing bypass: a client that varies its
        # forged X-Forwarded-For value must not influence the resolved IP.
        trusted_hops(0)
        peer = "203.0.113.7"
        for forged in ("1.2.3.4", "8.8.8.8", "10.0.0.1"):
            request = _make_request(xff=forged, peer=peer)
            assert rate_limit_module._get_client_ip(request) == peer

    def test_no_xff_uses_peer(self, trusted_hops):
        trusted_hops(0)
        request = _make_request(xff=None, peer="9.8.7.6")
        assert rate_limit_module._get_client_ip(request) == "9.8.7.6"

    def test_no_client_fallback(self, trusted_hops):
        trusted_hops(0)
        request = _make_request(xff="1.2.3.4", peer=None)
        assert rate_limit_module._get_client_ip(request) == "127.0.0.1"


class TestGetClientIpSingleTrustedHop:
    """TRUSTED_PROXY_HOPS == 1: take the entry immediately left of the proxy hop."""

    def test_single_hop_takes_leftmost(self, trusted_hops):
        trusted_hops(1)
        # client=1.2.3.4, proxy=5.6.7.8 -> strip rightmost (proxy) -> 1.2.3.4
        request = _make_request(xff="1.2.3.4, 5.6.7.8", peer="5.6.7.8")
        assert rate_limit_module._get_client_ip(request) == "1.2.3.4"

    def test_single_value_header_too_short_falls_back(self, trusted_hops):
        # Only one entry but we need at least 2 (client + 1 trusted hop);
        # cannot trust the prefix -> use peer.
        trusted_hops(1)
        request = _make_request(xff="1.2.3.4", peer="5.6.7.8")
        assert rate_limit_module._get_client_ip(request) == "5.6.7.8"

    def test_strips_whitespace(self, trusted_hops):
        trusted_hops(1)
        request = _make_request(xff="  1.2.3.4  ,  5.6.7.8  ", peer="5.6.7.8")
        assert rate_limit_module._get_client_ip(request) == "1.2.3.4"

    def test_no_xff_header_falls_back_to_peer(self, trusted_hops):
        trusted_hops(1)
        request = _make_request(xff=None, peer="5.6.7.8")
        assert rate_limit_module._get_client_ip(request) == "5.6.7.8"


class TestGetClientIpMultipleTrustedHops:
    """TRUSTED_PROXY_HOPS >= 2: CDN + LB style chains."""

    def test_two_hops(self, trusted_hops):
        # client=1.2.3.4, cdn=10.0.0.1, lb=10.0.0.2 -> strip rightmost 2 -> 1.2.3.4
        trusted_hops(2)
        request = _make_request(xff="1.2.3.4, 10.0.0.1, 10.0.0.2", peer="10.0.0.2")
        assert rate_limit_module._get_client_ip(request) == "1.2.3.4"

    def test_two_hops_picks_correct_left_entry(self, trusted_hops):
        # client=1.2.3.4, hopA=2.2.2.2, hopB=3.3.3.3, hopC=4.4.4.4
        # trusted=2 -> strip 3.3.3.3, 4.4.4.4 -> real client is 2.2.2.2
        trusted_hops(2)
        request = _make_request(
            xff="1.2.3.4, 2.2.2.2, 3.3.3.3, 4.4.4.4", peer="4.4.4.4"
        )
        assert rate_limit_module._get_client_ip(request) == "2.2.2.2"

    def test_header_shorter_than_hops_falls_back(self, trusted_hops):
        trusted_hops(3)
        request = _make_request(xff="1.2.3.4, 5.6.7.8", peer="5.6.7.8")
        assert rate_limit_module._get_client_ip(request) == "5.6.7.8"


class TestStorageUri:
    def test_under_pytest_uses_in_memory(self):
        # Sanity: tests never depend on a live Redis broker.
        assert rate_limit_module._running_under_pytest() is True
        assert rate_limit_module._resolve_storage_uri() is None

    def test_redis_url_configured_returns_redis_uri(self, monkeypatch):
        monkeypatch.setattr(rate_limit_module, "_running_under_pytest", lambda: False)
        monkeypatch.setattr(
            rate_limit_module.settings, "REDIS_URL", "redis://redis:6379/1"
        )
        assert rate_limit_module._resolve_storage_uri() == "redis://redis:6379/1"

    def test_redis_url_empty_falls_back_to_memory(self, monkeypatch):
        monkeypatch.setattr(rate_limit_module, "_running_under_pytest", lambda: False)
        monkeypatch.setattr(rate_limit_module.settings, "REDIS_URL", "")
        # Reset the one-shot warning flag so the warning fires again.
        monkeypatch.setattr(rate_limit_module, "_redis_fallback_warned", False)
        assert rate_limit_module._resolve_storage_uri() is None

    def test_redis_url_none_falls_back_to_memory(self, monkeypatch):
        monkeypatch.setattr(rate_limit_module, "_running_under_pytest", lambda: False)
        monkeypatch.setattr(rate_limit_module.settings, "REDIS_URL", None)
        monkeypatch.setattr(rate_limit_module, "_redis_fallback_warned", False)
        assert rate_limit_module._resolve_storage_uri() is None

    def test_redis_url_whitespace_only_falls_back_to_memory(self, monkeypatch):
        monkeypatch.setattr(rate_limit_module, "_running_under_pytest", lambda: False)
        monkeypatch.setattr(rate_limit_module.settings, "REDIS_URL", "   ")
        monkeypatch.setattr(rate_limit_module, "_redis_fallback_warned", False)
        assert rate_limit_module._resolve_storage_uri() is None


def test_default_settings_trusted_proxy_hops_is_zero():
    # Guards against an accidental change to the secure default.
    assert Settings().TRUSTED_PROXY_HOPS == 0
