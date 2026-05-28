from app.schemas.llm_model import ModelCreate, ModelUpdate
from app.schemas.provider import ProviderCreate, ProviderType, ProviderUpdate
from app.schemas.setting import SettingUpdate


def test_provider_create_schema():
    p = ProviderCreate(
        name="OpenAI",
        type=ProviderType.OPENAI_COMPATIBLE,
        base_url="https://api.openai.com",
        api_key="sk-test-key",
    )
    assert p.name == "OpenAI"
    assert p.type == ProviderType.OPENAI_COMPATIBLE


def test_provider_update_schema_all_optional():
    p = ProviderUpdate()
    assert p.name is None
    assert p.type is None
    assert p.base_url is None
    assert p.api_key is None


def test_model_create_schema():
    m = ModelCreate(provider_id="abc", model_id="gpt-4o")
    assert m.display_name is None
    assert m.extra_config is None


def test_setting_update_schema():
    s = SettingUpdate(value="model-123")
    assert s.value == "model-123"
