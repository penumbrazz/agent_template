"""Tests for shared.utils.crypto — AES-256-GCM encryption with strict key handling."""

import base64
import os

import pytest
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.padding import PKCS7

from shared.utils import crypto
from shared.utils.crypto import (
    _NONCE_SIZE,
    _VERSION_BYTE,
    _legacy_iv,
    decrypt_api_key,
    decrypt_attachment,
    decrypt_sensitive_data,
    encrypt_api_key,
    encrypt_attachment,
    encrypt_sensitive_data,
    is_api_key_encrypted,
    is_attachment_encrypted,
    is_data_encrypted,
    mask_api_key,
)

VALID_KEY = "a" * 32  # exactly 32 bytes
ALT_KEY = "b" * 32


@pytest.fixture(autouse=True)
def _reset_key_cache():
    """Ensure each test starts with a clean key cache."""
    crypto._reset_key_cache()
    yield
    crypto._reset_key_cache()


@pytest.fixture(autouse=True)
def _isolate_env(monkeypatch):
    """Strip any inherited encryption env so tests are deterministic."""
    for var in ("ENCRYPTION_KEY", "GIT_TOKEN_AES_KEY", "ATTACHMENT_AES_KEY"):
        monkeypatch.delenv(var, raising=False)


def _set_key(monkeypatch, key=VALID_KEY, attachment_key=None):
    monkeypatch.setenv("ENCRYPTION_KEY", key)
    if attachment_key is not None:
        monkeypatch.setenv("ATTACHMENT_AES_KEY", attachment_key)


# ---------------------------------------------------------------------------
# Round-trip encryption
# ---------------------------------------------------------------------------
class TestRoundTrip:
    def test_encrypt_then_decrypt_sensitive_data(self, monkeypatch):
        _set_key(monkeypatch)
        plaintext = "super-secret-api-key-12345"
        encrypted = encrypt_sensitive_data(plaintext)
        assert encrypted != plaintext
        assert decrypt_sensitive_data(encrypted) == plaintext

    def test_encrypt_then_decrypt_unicode(self, monkeypatch):
        _set_key(monkeypatch)
        plaintext = "中文密钥-🔐-token"
        encrypted = encrypt_sensitive_data(plaintext)
        assert decrypt_sensitive_data(encrypted) == plaintext

    def test_encrypt_then_decrypt_attachment(self, monkeypatch):
        _set_key(monkeypatch)
        data = b"\x89PNG\r\n\x1a\n" + os.urandom(256)
        encrypted = encrypt_attachment(data)
        assert encrypted != data
        assert decrypt_attachment(encrypted) == data

    def test_encrypt_then_decrypt_api_key(self, monkeypatch):
        _set_key(monkeypatch)
        key = "sk-live-abcdef0123456789"
        encrypted = encrypt_api_key(key)
        assert decrypt_api_key(encrypted) == key

    def test_empty_and_mask_inputs_pass_through(self, monkeypatch):
        _set_key(monkeypatch)
        assert encrypt_sensitive_data("") == ""
        assert decrypt_sensitive_data("") == ""
        assert encrypt_sensitive_data("***") == "***"
        assert decrypt_sensitive_data("***") == "***"
        assert encrypt_attachment(b"") == b""
        assert decrypt_attachment(b"") == b""


# ---------------------------------------------------------------------------
# Nonce freshness
# ---------------------------------------------------------------------------
class TestNonceFreshness:
    def test_nonce_differs_per_encryption(self, monkeypatch):
        _set_key(monkeypatch)
        plaintext = "same-input"
        c1 = encrypt_sensitive_data(plaintext)
        c2 = encrypt_sensitive_data(plaintext)
        # Ciphertexts must differ because nonce is random.
        assert c1 != c2
        # Both decrypt back to the same plaintext.
        assert decrypt_sensitive_data(c1) == plaintext
        assert decrypt_sensitive_data(c2) == plaintext

    def test_raw_ciphertext_carries_version_and_nonce(self, monkeypatch):
        _set_key(monkeypatch)
        raw = base64.b64decode(encrypt_sensitive_data("payload"))
        assert raw[:1] == _VERSION_BYTE
        assert len(raw) > 1 + _NONCE_SIZE + 16


# ---------------------------------------------------------------------------
# Key-missing enforcement
# ---------------------------------------------------------------------------
class TestKeyMissing:
    def test_encrypt_raises_when_encryption_key_unset(self):
        with pytest.raises(RuntimeError, match="ENCRYPTION_KEY is not set"):
            encrypt_sensitive_data("secret")

    def test_decrypt_returns_raw_when_encryption_key_unset(self, caplog):
        # decrypt_sensitive_data intentionally swallows internal errors and returns
        # the original blob so a missing key never crashes a request. The key loader
        # still runs and emits a warning — assert on that contract here.
        blob = base64.b64encode(_VERSION_BYTE + os.urandom(_NONCE_SIZE + 32)).decode(
            "utf-8"
        )
        with caplog.at_level("WARNING", logger="shared.utils.crypto"):
            result = decrypt_sensitive_data(blob)
        assert result == blob  # plaintext never leaks; raw blob returned
        assert any("ENCRYPTION_KEY is not set" in rec.message for rec in caplog.records)

    def test_encrypt_attachment_raises_when_keys_unset(self):
        with pytest.raises(RuntimeError, match="ATTACHMENT_AES_KEY is not set"):
            encrypt_attachment(b"binary-data")

    def test_decrypt_attachment_raises_when_keys_unset(self):
        blob = _VERSION_BYTE + os.urandom(_NONCE_SIZE + 32)
        with pytest.raises(RuntimeError, match="ATTACHMENT_AES_KEY is not set"):
            decrypt_attachment(blob)

    def test_git_token_alias_accepted(self, monkeypatch):
        # GIT_TOKEN_AES_KEY should still be honored for backward compatibility.
        monkeypatch.setenv("GIT_TOKEN_AES_KEY", ALT_KEY)
        encrypted = encrypt_sensitive_data("token")
        assert decrypt_sensitive_data(encrypted) == "token"

    def test_attachment_falls_back_to_encryption_key(self, monkeypatch):
        monkeypatch.setenv("ENCRYPTION_KEY", VALID_KEY)
        data = b"fallback-key-attachment"
        encrypted = encrypt_attachment(data)
        assert decrypt_attachment(encrypted) == data


# ---------------------------------------------------------------------------
# Key-length validation
# ---------------------------------------------------------------------------
class TestKeyLength:
    @pytest.mark.parametrize(
        "bad_key", ["short", "a" * 16, "a" * 31, "a" * 33, "a" * 64]
    )
    def test_wrong_length_encryption_key_raises(self, monkeypatch, bad_key):
        monkeypatch.setenv("ENCRYPTION_KEY", bad_key)
        with pytest.raises(
            RuntimeError, match="ENCRYPTION_KEY must be exactly 32 bytes"
        ):
            encrypt_sensitive_data("secret")

    @pytest.mark.parametrize("bad_key", ["short", "a" * 16, "a" * 31, "a" * 33])
    def test_wrong_length_attachment_key_raises(self, monkeypatch, bad_key):
        monkeypatch.setenv("ATTACHMENT_AES_KEY", bad_key)
        with pytest.raises(
            RuntimeError, match="ATTACHMENT_AES_KEY must be exactly 32 bytes"
        ):
            encrypt_attachment(b"data")


# ---------------------------------------------------------------------------
# Legacy CBC decryption (backward compatibility for old data)
# ---------------------------------------------------------------------------
class TestLegacyCbc:
    @staticmethod
    def _legacy_cbc_encrypt(key: bytes, iv: bytes, plaintext: bytes) -> bytes:
        """Reproduce the removed legacy CBC encryption to build test vectors."""
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        padder = PKCS7(128).padder()
        padded = padder.update(plaintext) + padder.finalize()
        return encryptor.update(padded) + encryptor.finalize()

    def test_legacy_cbc_blob_decrypts_via_sensitive_path(self, monkeypatch):
        _set_key(monkeypatch, key=VALID_KEY)
        plaintext = "old-git-token-abc123"
        legacy_raw = self._legacy_cbc_encrypt(
            VALID_KEY.encode("utf-8"), _legacy_iv, plaintext.encode("utf-8")
        )
        legacy_blob = base64.b64encode(legacy_raw).decode("utf-8")
        assert is_data_encrypted(legacy_blob) is True
        assert decrypt_sensitive_data(legacy_blob) == plaintext

    def test_legacy_cbc_attachment_decrypts(self, monkeypatch):
        _set_key(monkeypatch, key=VALID_KEY)
        plaintext = b"\x00\x01\x02\x03 legacy attachment payload"
        legacy_raw = self._legacy_cbc_encrypt(
            VALID_KEY.encode("utf-8"),
            crypto._legacy_attachment_iv,
            plaintext,
        )
        assert is_attachment_encrypted(legacy_raw) is True
        assert decrypt_attachment(legacy_raw) == plaintext

    def test_gcm_and_legacy_cbc_coexist(self, monkeypatch):
        _set_key(monkeypatch, key=VALID_KEY)
        legacy_blob = base64.b64encode(
            self._legacy_cbc_encrypt(
                VALID_KEY.encode("utf-8"),
                _legacy_iv,
                b"legacy-value",
            )
        ).decode("utf-8")
        gcm_blob = encrypt_sensitive_data("gcm-value")
        assert decrypt_sensitive_data(legacy_blob) == "legacy-value"
        assert decrypt_sensitive_data(gcm_blob) == "gcm-value"


# ---------------------------------------------------------------------------
# Detection helpers
# ---------------------------------------------------------------------------
class TestDetectionHelpers:
    def test_is_data_encrypted_recognizes_gcm(self, monkeypatch):
        _set_key(monkeypatch)
        assert is_data_encrypted(encrypt_sensitive_data("x")) is True

    def test_is_data_encrypted_rejects_plaintext(self):
        assert is_data_encrypted("not-encrypted") is False
        assert is_data_encrypted("") is False

    def test_is_api_key_encrypted_handles_plaintext_prefixes(self, monkeypatch):
        _set_key(monkeypatch)
        for plain in ("sk-abc", "sk_xyz", "api-foo", "api_bar", "key-1", "key_2"):
            assert is_api_key_encrypted(plain) is False
        assert is_api_key_encrypted(encrypt_api_key("no-prefix-key")) is True

    def test_is_attachment_encrypted_handles_empty(self):
        assert is_attachment_encrypted(b"") is False

    def test_mask_api_key(self, monkeypatch):
        _set_key(monkeypatch)
        assert mask_api_key("") == "***"
        assert mask_api_key("***") == "***"
        assert mask_api_key("sk-short") == "***"
        assert mask_api_key("sk-this-is-long-enough") == "sk-t...ough"
        assert mask_api_key(encrypt_api_key("no-prefix-key")) == "***"

    def test_encrypt_api_key_idempotent_for_already_encrypted(self, monkeypatch):
        _set_key(monkeypatch)
        encrypted = encrypt_api_key("raw-key-value")
        assert encrypt_api_key(encrypted) == encrypted


# ---------------------------------------------------------------------------
# Wrong key produces failure (not silent success)
# ---------------------------------------------------------------------------
class TestWrongKey:
    def test_decrypt_with_different_key_fails_gracefully(self, monkeypatch):
        _set_key(monkeypatch, key=ALT_KEY)
        blob = encrypt_sensitive_data("secret")
        # Switch to a different valid key — GCM tag check must reject it.
        crypto._reset_key_cache()
        _set_key(monkeypatch, key=VALID_KEY)
        # decrypt_sensitive_data swallows internal errors and returns the raw blob
        # when it cannot decode; the important guarantee is that plaintext never leaks.
        result = decrypt_sensitive_data(blob)
        assert result != "secret"
