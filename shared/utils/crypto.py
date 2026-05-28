# SPDX-FileCopyrightText: 2025 Weibo, Inc.
#
# SPDX-License-Identifier: Apache-2.0

"""
Cryptography utilities for encrypting sensitive data like git tokens and API keys.

Uses AES-256-GCM with a random nonce per encryption. Nonce is prepended to ciphertext.
Legacy AES-256-CBC data (static IV) is supported for backward-compatible decryption only.
"""

import base64
import logging
import os
from typing import Optional

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.padding import PKCS7

logger = logging.getLogger(__name__)

_VERSION_BYTE = b"\x01"
_NONCE_SIZE = 12  # 96-bit nonce recommended for AES-GCM

# Global encryption key cache
_aes_key: Optional[bytes] = None

# Global attachment encryption key cache
_attachment_aes_key: Optional[bytes] = None

# Legacy static IVs — kept only for backward-compatible decryption of old CBC data
_legacy_iv = b"1234567890123456"
_legacy_attachment_iv = b"1234567890123456"


def _get_encryption_key() -> bytes:
    """Load or return cached AES-256 key from GIT_TOKEN_AES_KEY env var."""
    global _aes_key
    if _aes_key is None:
        key = os.environ.get("GIT_TOKEN_AES_KEY", "12345678901234567890123456789012")
        _aes_key = key.encode("utf-8")
        logger.info("Loaded encryption key from environment variables")
    return _aes_key


def _get_attachment_encryption_key() -> bytes:
    """Load or return cached attachment AES-256 key from ATTACHMENT_AES_KEY env var."""
    global _attachment_aes_key
    if _attachment_aes_key is None:
        key = os.environ.get(
            "ATTACHMENT_AES_KEY", "12345678901234567890123456789012"
        )
        _attachment_aes_key = key.encode("utf-8")
        logger.info("Loaded attachment encryption key from environment variables")
    return _attachment_aes_key


def _aes_gcm_encrypt(key: bytes, plaintext: bytes) -> bytes:
    """AES-GCM encrypt with random nonce. Returns version_byte + nonce + ciphertext + tag."""
    nonce = os.urandom(_NONCE_SIZE)
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, plaintext, None)
    return _VERSION_BYTE + nonce + ciphertext


def _aes_gcm_decrypt(key: bytes, data: bytes) -> bytes:
    """AES-GCM decrypt. Expects version_byte + nonce + ciphertext + tag."""
    nonce = data[1 : 1 + _NONCE_SIZE]
    ciphertext = data[1 + _NONCE_SIZE :]
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ciphertext, None)


def _legacy_cbc_decrypt(key: bytes, iv: bytes, encrypted_bytes: bytes) -> bytes:
    """Decrypt legacy AES-CBC data (static IV, no version byte)."""
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    decryptor = cipher.decryptor()
    decrypted_padded = decryptor.update(encrypted_bytes) + decryptor.finalize()
    unpadder = PKCS7(128).unpadder()
    return unpadder.update(decrypted_padded) + unpadder.finalize()


def _legacy_cbc_encrypt(key: bytes, iv: bytes, plaintext: bytes) -> bytes:
    """Encrypt using legacy AES-CBC (static IV). Used only for fallback scenarios."""
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    padder = PKCS7(128).padder()
    padded = padder.update(plaintext) + padder.finalize()
    return encryptor.update(padded) + encryptor.finalize()


# ============================================================================
# Core encryption/decryption functions
# ============================================================================


def encrypt_sensitive_data(plain_text: str) -> str:
    """
    Encrypt sensitive data using AES-256-GCM encryption.

    Args:
        plain_text: Plain text data to encrypt

    Returns:
        Base64 encoded: version_byte + nonce + ciphertext + tag
    """
    if not plain_text:
        return ""

    if plain_text == "***":
        return "***"

    try:
        key = _get_encryption_key()
        encrypted = _aes_gcm_encrypt(key, plain_text.encode("utf-8"))
        return base64.b64encode(encrypted).decode("utf-8")
    except Exception as e:
        logger.error(f"Failed to encrypt sensitive data: {e}")
        raise


def decrypt_sensitive_data(encrypted_text: str) -> Optional[str]:
    """
    Decrypt sensitive data. Supports AES-256-GCM (current) and legacy AES-256-CBC.

    Args:
        encrypted_text: Base64 encoded encrypted data

    Returns:
        Decrypted plain text, or original text if decryption fails
    """
    if not encrypted_text:
        return ""

    if encrypted_text == "***":
        return "***"

    try:
        raw = base64.b64decode(encrypted_text.encode("utf-8"))
    except Exception:
        return encrypted_text

    # Try AES-GCM (version byte 0x01)
    if raw[:1] == _VERSION_BYTE and len(raw) > 1 + _NONCE_SIZE + 16:
        try:
            key = _get_encryption_key()
            return _aes_gcm_decrypt(key, raw).decode("utf-8")
        except Exception:
            pass  # Fall through to legacy

    # Legacy AES-CBC fallback (static IV)
    try:
        key = _get_encryption_key()
        decrypted = _legacy_cbc_decrypt(key, _legacy_iv, raw)
        return decrypted.decode("utf-8")
    except Exception as e:
        logger.warning(f"Failed to decrypt sensitive data: {e}")
        return encrypted_text


def is_data_encrypted(data: str) -> bool:
    """Check if data appears to be encrypted (base64 encoded with GCM or CBC format)."""
    if not data:
        return False

    try:
        decoded = base64.b64decode(data.encode("utf-8"))
        if not decoded:
            return False
        # GCM format: version byte + 12-byte nonce + ciphertext + 16-byte tag
        if decoded[:1] == _VERSION_BYTE:
            return len(decoded) > 1 + _NONCE_SIZE + 16
        # Legacy CBC: any valid base64 with block-aligned length
        return len(decoded) % 16 == 0
    except Exception:
        return False


# ============================================================================
# Git Token specific functions
# ============================================================================


def encrypt_git_token(plain_token: str) -> str:
    """Encrypt git token using AES-256-GCM encryption."""
    return encrypt_sensitive_data(plain_token)


def decrypt_git_token(encrypted_token: str) -> Optional[str]:
    """Decrypt git token. Supports GCM and legacy CBC formats."""
    return decrypt_sensitive_data(encrypted_token)


def is_token_encrypted(token: str) -> bool:
    """Check if a token appears to be encrypted."""
    return is_data_encrypted(token)


# ============================================================================
# API Key specific functions
# ============================================================================


def encrypt_api_key(plain_key: str) -> str:
    """Encrypt API key using AES-256-GCM encryption."""
    if not plain_key:
        return ""

    if is_api_key_encrypted(plain_key):
        return plain_key

    return encrypt_sensitive_data(plain_key)


def decrypt_api_key(encrypted_key: str) -> Optional[str]:
    """Decrypt API key. Supports GCM and legacy CBC formats."""
    if not encrypted_key:
        return ""

    if not is_api_key_encrypted(encrypted_key):
        return encrypted_key

    return decrypt_sensitive_data(encrypted_key)


def is_api_key_encrypted(key: str) -> bool:
    """Check if an API key appears to be encrypted."""
    if not key:
        return False

    plain_text_prefixes = ["sk-", "sk_", "api-", "api_", "key-", "key_"]
    for prefix in plain_text_prefixes:
        if key.startswith(prefix):
            return False

    return is_data_encrypted(key)


def mask_api_key(key: str) -> str:
    """Mask an API key for display purposes."""
    if not key or key == "***":
        return "***"

    if is_api_key_encrypted(key):
        return "***"

    if len(key) <= 8:
        return "***"

    return f"{key[:4]}...{key[-4:]}"


# ============================================================================
# Attachment encryption functions
# ============================================================================


def encrypt_attachment(binary_data: bytes) -> bytes:
    """
    Encrypt attachment binary data using AES-256-GCM encryption.

    Args:
        binary_data: Attachment binary data to encrypt

    Returns:
        version_byte + nonce + ciphertext + tag (raw bytes)
    """
    if not binary_data:
        return b""

    try:
        key = _get_attachment_encryption_key()
        return _aes_gcm_encrypt(key, binary_data)
    except Exception as e:
        logger.error(f"Failed to encrypt attachment data: {e}")
        raise


def decrypt_attachment(encrypted_data: bytes) -> bytes:
    """
    Decrypt attachment binary data. Supports AES-256-GCM and legacy AES-256-CBC.

    Args:
        encrypted_data: Encrypted binary data

    Returns:
        Decrypted binary data
    """
    if not encrypted_data:
        return b""

    # Try AES-GCM (version byte 0x01)
    if encrypted_data[:1] == _VERSION_BYTE and len(encrypted_data) > 1 + _NONCE_SIZE + 16:
        try:
            key = _get_attachment_encryption_key()
            return _aes_gcm_decrypt(key, encrypted_data)
        except Exception:
            pass  # Fall through to legacy

    # Legacy AES-CBC fallback
    try:
        key = _get_attachment_encryption_key()
        return _legacy_cbc_decrypt(key, _legacy_attachment_iv, encrypted_data)
    except Exception as e:
        logger.error(f"Failed to decrypt attachment data: {e}")
        raise


def is_attachment_encrypted(data: bytes) -> bool:
    """Check if attachment data appears to be encrypted."""
    if not data or len(data) == 0:
        return False

    if data[:1] == _VERSION_BYTE:
        return len(data) > 1 + _NONCE_SIZE + 16

    return len(data) % 16 == 0
