"""Tests for the sensitive data masker.

Covers three areas:
- Positive masking: real credentials in strings and dicts are masked.
- Negative masking: ordinary prose and benign env var names are NOT masked
  (regression coverage for over-broad patterns).
- Format-anchored patterns: AWS keys, GitHub tokens, JWT, DB URLs, etc.
"""

import pytest

from shared.utils.sensitive_data_masker import (
    SensitiveDataMasker,
    mask_sensitive_data,
    mask_string,
)


# ---------------------------------------------------------------------------
# Positive: real credentials must be masked
# ---------------------------------------------------------------------------
class TestPositiveMasking:
    """Ensure genuine secrets are masked in all entry points."""

    def test_long_token_in_free_text_is_masked(self) -> None:
        text = "token: AbcDef1234567890xyz99"
        masked = mask_string(text)
        assert "AbcDef1234567890xyz99" not in masked
        assert "*" in masked

    def test_api_key_in_dict_is_masked(self) -> None:
        data = {"API_KEY": "sk-AbcDef1234567890123456789"}
        masked = mask_sensitive_data(data)
        assert masked["API_KEY"].startswith("sk-A")
        assert "*" in masked["API_KEY"]
        assert "1234567890123456789" not in masked["API_KEY"]

    def test_anthropic_sk_key_is_masked(self) -> None:
        # Format-anchored pattern; entropy filter does not apply.
        text = "key=sk-AbCdEf1234567890AbCdEf1234567890AbCdEf1234567890"
        masked = mask_string(text)
        assert "AbCdEf1234567890AbCdEf1234567890AbCdEf1234567890" not in masked

    def test_long_password_is_masked(self) -> None:
        text = "password: CorrectHorse9Battery!"
        masked = mask_string(text)
        assert "CorrectHorse9Battery!" not in masked
        assert "*" in masked

    def test_export_statement_masks_value(self) -> None:
        text = 'export GITHUB_TOKEN="ghp_1234567890abcdefghijklmnopqrstuvwxyz1234"'
        masked = mask_string(text)
        assert "ghp_1234567890abcdefghijklmnopqrstuvwxyz1234" not in masked
        assert "GITHUB_TOKEN" in masked  # variable name preserved

    def test_jwt_token_is_masked(self) -> None:
        text = "token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
        masked = mask_string(text)
        assert "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c" not in masked

    def test_postgres_url_password_is_masked(self) -> None:
        text = "postgresql://user:secretpass123@host/db"
        masked = mask_string(text)
        assert "secretpass123" not in masked
        assert "postgresql://user:" in masked
        assert "@host/db" in masked

    def test_github_pat_is_masked(self) -> None:
        text = "github_pat_ABCDEF1234567890abcdefghij"
        masked = mask_string(text)
        assert "github_pat_ABCDEF1234567890abcdefghij" not in masked

    def test_aws_access_key_is_masked(self) -> None:
        text = "AKIAABCDEFGHIJKLMNOP"
        masked = mask_string(text)
        assert "AKIAABCDEFGHIJKLMNOP" not in masked

    def test_dict_recursive_masking(self) -> None:
        data = {
            "outer": {
                "SECRET_KEY": "AbcDef1234567890GhiJkl",
                "note": "hello world",
            }
        }
        masked = mask_sensitive_data(data)
        inner = masked["outer"]
        assert inner["SECRET_KEY"].startswith("AbcD")
        assert "*" in inner["SECRET_KEY"]
        # benign nested string is untouched
        assert inner["note"] == "hello world"


# ---------------------------------------------------------------------------
# Negative: ordinary prose must NOT be masked
# ---------------------------------------------------------------------------
class TestNoFalsePositives:
    """Regression tests for over-broad patterns that masked normal text."""

    def test_short_token_in_sentence_not_masked(self) -> None:
        text = "the token is abc123"
        assert mask_string(text) == "the token is abc123"

    def test_secret_as_english_word_not_masked(self) -> None:
        text = "I have a secret plan for tomorrow"
        assert mask_string(text) == "I have a secret plan for tomorrow"

    def test_short_password_word_not_masked(self) -> None:
        text = "my password is hello"
        assert mask_string(text) == "my password is hello"

    def test_short_api_key_value_not_masked(self) -> None:
        text = "the api key is abc123short"
        assert mask_string(text) == "the api key is abc123short"

    def test_monkey_key_env_var_not_masked(self) -> None:
        # ``_KEY`` alone is too broad (catches MONKEY_KEY, ANIMAL_KEY, ...).
        # Only specific suffixes such as API_KEY / SECRET_KEY are sensitive.
        data = {"MONKEY_KEY": "somevalue"}
        masked = mask_sensitive_data(data)
        assert masked["MONKEY_KEY"] == "somevalue"

    def test_generic_auth_env_var_not_masked(self) -> None:
        # ``_AUTH`` alone is too broad.
        data = {"GRAPH_AUTH_TYPE": "oauth"}
        masked = mask_sensitive_data(data)
        assert masked["GRAPH_AUTH_TYPE"] == "oauth"

    def test_non_sensitive_host_env_not_masked(self) -> None:
        data = {"DATABASE_HOST": "db.internal"}
        masked = mask_sensitive_data(data)
        assert masked["DATABASE_HOST"] == "db.internal"


# ---------------------------------------------------------------------------
# Pattern coverage
# ---------------------------------------------------------------------------
class TestPatternCoverage:
    """Targeted coverage of individual credential patterns and helpers."""

    def test_looks_like_credential_short_lower_only(self) -> None:
        assert SensitiveDataMasker._looks_like_credential("abc123") is False

    def test_looks_like_credential_long_lower_digit(self) -> None:
        assert (
            SensitiveDataMasker._looks_like_credential("abcdef123456abcdef1234") is True
        )

    def test_looks_like_credential_mixed_short(self) -> None:
        # 8 chars with upper+lower+digit
        assert SensitiveDataMasker._looks_like_credential("Abc1234d") is True

    def test_looks_like_credential_very_long(self) -> None:
        assert SensitiveDataMasker._looks_like_credential("a" * 32) is True

    def test_mask_value_short_returns_full_mask(self) -> None:
        masker = SensitiveDataMasker()
        assert masker._mask_value("abc") == "***"

    def test_mask_value_long_shows_prefix_suffix(self) -> None:
        masker = SensitiveDataMasker()
        result = masker._mask_value("AbcDef1234567890GhiJkl")
        assert result.startswith("AbcD")
        assert result.endswith("iJkl")
        assert "*" in result

    def test_mask_any_passthrough_for_scalars(self) -> None:
        assert mask_sensitive_data(42) == 42
        assert mask_sensitive_data(None) is None

    def test_mask_list_masks_sensitive_strings(self) -> None:
        data = ["token: AbcDef1234567890xyz99", "plain text"]
        masked = mask_sensitive_data(data)
        assert "AbcDef1234567890xyz99" not in masked[0]
        assert masked[1] == "plain text"

    def test_empty_string_passthrough(self) -> None:
        assert mask_string("") == ""

    def test_non_string_input_passthrough(self) -> None:
        masker = SensitiveDataMasker()
        assert masker.mask_string(None) is None  # type: ignore[arg-type]
        assert masker.mask_string(123) == 123  # type: ignore[arg-type]

    def test_custom_mask_char(self) -> None:
        masker = SensitiveDataMasker(mask_char="#")
        result = masker._mask_value("AbcDef1234567890GhiJkl")
        assert "#" in result
        assert "*" not in result
