from shared.telemetry.config import get_otel_config, reset_otel_config


def test_otel_config_is_disabled_by_default(monkeypatch):
    monkeypatch.delenv("OTEL_ENABLED", raising=False)
    reset_otel_config()

    config = get_otel_config("agent-template-test")

    assert config.enabled is False
    assert config.service_name == "agent-template-test"
