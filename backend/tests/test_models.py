from app.models.llm_model import LLMModel
from app.models.provider import Provider
from app.models.setting import Setting


def test_provider_model_has_tablename():
    assert Provider.__tablename__ == "providers"


def test_llm_model_has_tablename():
    assert LLMModel.__tablename__ == "llm_models"


def test_setting_model_has_tablename():
    assert Setting.__tablename__ == "settings"
