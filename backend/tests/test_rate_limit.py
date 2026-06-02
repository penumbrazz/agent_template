from unittest.mock import MagicMock

from app.core.rate_limit import _get_client_ip


class TestGetClientIp:
    def test_x_forwarded_for_multiple_ips(self):
        request = MagicMock()
        request.headers.get.return_value = "1.2.3.4, 5.6.7.8"
        assert _get_client_ip(request) == "1.2.3.4"

    def test_x_forwarded_for_single_ip(self):
        request = MagicMock()
        request.headers.get.return_value = "1.2.3.4"
        assert _get_client_ip(request) == "1.2.3.4"

    def test_x_forwarded_for_strips_whitespace(self):
        request = MagicMock()
        request.headers.get.return_value = "  1.2.3.4  ,  5.6.7.8  "
        assert _get_client_ip(request) == "1.2.3.4"

    def test_fallback_to_client_host(self):
        request = MagicMock()
        request.headers.get.return_value = None
        request.client = MagicMock()
        request.client.host = "9.8.7.6"
        assert _get_client_ip(request) == "9.8.7.6"

    def test_no_client_fallback(self):
        request = MagicMock()
        request.headers.get.return_value = None
        request.client = None
        assert _get_client_ip(request) == "127.0.0.1"
