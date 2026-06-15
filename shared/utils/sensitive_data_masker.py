"""
Sensitive data masking utility for protecting confidential information in logs and API responses.
This module provides functionality to detect and mask sensitive data such as:
- API keys and tokens (GitHub, GitLab, Anthropic, etc.)
- Passwords and secrets
- Database connection strings
- JWT tokens
- Environment variable values containing sensitive data
"""

import re
from typing import Any, Dict, List, Optional, Union


class SensitiveDataMasker:
    """Utility class for masking sensitive information in strings and data structures."""

    # Patterns for detecting sensitive data
    SENSITIVE_PATTERNS = [
        # API Keys and Tokens
        (r"(github_pat_[a-zA-Z0-9_]+)", "GITHUB_TOKEN"),
        (r"(ghp_[a-zA-Z0-9]{36,})", "GITHUB_TOKEN"),
        (r"(gho_[a-zA-Z0-9]{36,})", "GITHUB_OAUTH_TOKEN"),
        (r"(glpat-[a-zA-Z0-9_\-]{20,})", "GITLAB_TOKEN"),
        (r"(sk-[a-zA-Z0-9]{48,})", "ANTHROPIC_API_KEY"),
        (r"(sk-ant-[a-zA-Z0-9\-_]{95,})", "ANTHROPIC_API_KEY"),
        # AWS Keys
        (r"(AKIA[0-9A-Z]{16})", "AWS_ACCESS_KEY"),
        # AWS Secret Key pattern - more specific with word boundaries and context
        (
            r'\b(aws[_-]?secret[_-]?(?:access[_-]?)?key["\s:=]+)([a-zA-Z0-9/+=]{40})\b',
            "AWS_SECRET_KEY",
        ),
        (
            r'(secret[_-]?(?:access[_-]?)?key["\s:=]+)([a-zA-Z0-9/+=]{40})\b',
            "AWS_SECRET_KEY",
        ),
        # Generic tokens and secrets.
        # These are heuristic patterns applied to free text, so the captured value
        # must look like a credential (high entropy / sufficient length) to avoid
        # masking ordinary prose such as "the token is abc123" or "I have a secret
        # plan". ``mask_string`` gates these labels through
        # ``_looks_like_credential`` before masking; see that helper for the
        # canonical heuristic.
        (r'(token["\s:=]+)([a-zA-Z0-9_\-\.]+)', "TOKEN"),
        (r'(secret["\s:=]+)([a-zA-Z0-9_\-\.]+)', "SECRET"),
        (r'(api[_-]?key["\s:=]+)([a-zA-Z0-9_\-\.]+)', "API_KEY"),
        (r'(auth[_-]?token["\s:=]+)([a-zA-Z0-9_\-\.]+)', "AUTH_TOKEN"),
        # JWT Tokens
        (r"(eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)", "JWT_TOKEN"),
        # Passwords. Same entropy heuristic applies: short dictionary words such
        # as "hello" must not be masked, real passwords (>=8 chars or complex)
        # still are.
        (r'(password["\s:=]+)([^\s"\']+)', "PASSWORD"),
        (r'(passwd["\s:=]+)([^\s"\']+)', "PASSWORD"),
        (r'(pwd["\s:=]+)([^\s"\']+)', "PASSWORD"),
        # Database URLs with credentials
        (r"(mysql://[^:]+:)([^@]+)(@)", "DB_PASSWORD"),
        (r"(postgresql://[^:]+:)([^@]+)(@)", "DB_PASSWORD"),
        (r"(mongodb://[^:]+:)([^@]+)(@)", "DB_PASSWORD"),
        # Private keys
        (
            r"(-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]+?-----END [A-Z ]+PRIVATE KEY-----)",
            "PRIVATE_KEY",
        ),
    ]
    # Environment variable name substrings that indicate a sensitive value.
    # Narrower than the previous list: generic suffixes such as ``_KEY`` or
    # ``_AUTH`` caused false positives on names like ``MONKEY_KEY`` or
    # ``GRAPH_AUTH_TYPE``. Only specific, well-known credential-bearing suffixes
    # are kept so that structured keys remain precise.
    SENSITIVE_ENV_VARS = [
        "_TOKEN",
        "API_KEY",
        "SECRET_KEY",
        "ACCESS_KEY",
        "PRIVATE_KEY",
        "PUBLIC_KEY",
        "PASSWORD",
        "PASSWD",
        "_SECRET",
        "_AUTH_TOKEN",
        "AUTHORIZATION",
        "CREDENTIAL",
        "DATABASE_URL",
        "DB_URL",
        "ANTHROPIC",
        "OPENAI",
        "GITHUB_TOKEN",
        "GITLAB_TOKEN",
        "AWS_ACCESS",
        "AWS_SECRET",
        "OIDC_",
        "AES_KEY",
        "AES_IV",
        "ENCRYPTION",
    ]
    # Non-sensitive patterns that should be excluded even if they match above
    NON_SENSITIVE_PATTERNS = [
        "_HOST",
        "_PORT",
        "_ADDR",
        "SERVICE_",
        "KUBERNETES_",
        "_TCP_",
        "_UDP_",
        "PORT_",
        "_URL",
    ]

    def __init__(
        self, mask_char: str = "*", show_prefix_len: int = 4, show_suffix_len: int = 4
    ):
        """
        Initialize the masker with customizable masking behavior.
        Args:
            mask_char: Character to use for masking (default: '*')
            show_prefix_len: Number of characters to show at the beginning (default: 4)
            show_suffix_len: Number of characters to show at the end (default: 4)
        """
        self.mask_char = mask_char
        self.show_prefix_len = show_prefix_len
        self.show_suffix_len = show_suffix_len
        # Compile regex patterns for better performance
        self.compiled_patterns = [
            (re.compile(pattern, re.IGNORECASE | re.MULTILINE), label)
            for pattern, label in self.SENSITIVE_PATTERNS
        ]

    def _mask_value(self, value: str, min_length: int = 8) -> str:
        """
        Mask a sensitive value, showing only prefix and suffix.
        Args:
            value: The value to mask
            min_length: Minimum length to apply masking (default: 8)
        Returns:
            Masked value string
        """
        if len(value) < min_length:
            return self.mask_char * len(value)
        if len(value) <= (self.show_prefix_len + self.show_suffix_len):
            return self.mask_char * len(value)
        prefix = value[: self.show_prefix_len]
        suffix = value[-self.show_suffix_len :]
        masked_middle = self.mask_char * 12  # Fixed length for consistency
        return f"{prefix}{masked_middle}{suffix}"

    @staticmethod
    def _looks_like_credential(value: str) -> bool:
        """Heuristic check for whether a free-text captured value looks like a credential.

        Free-text patterns such as ``token=...`` or ``the secret is ...`` are
        inherently ambiguous: a sentence like ``the token is abc123`` matches the
        same shape as ``token: eyJhbGciOi...``. To avoid masking ordinary prose,
        we only treat the captured value as sensitive when it exhibits enough
        complexity:

        - Very long values (>=32 chars) are always treated as credentials.
        - Medium values (>=20 chars) that mix letters and digits are credentials.
        - Shorter values (>=8 chars) must combine uppercase, lowercase and digits
          to count (a strong indicator of an opaque token).

        Short dictionary words (``abc123``, ``hello``, ``plan``) and trivially
        short strings never match.
        """
        if not value:
            return False
        has_upper = any(c.isupper() for c in value)
        has_lower = any(c.islower() for c in value)
        has_digit = any(c.isdigit() for c in value)
        length = len(value)
        if length >= 32:
            return True
        if length >= 20 and has_lower and has_digit:
            return True
        if length >= 8 and has_upper and has_lower and has_digit:
            return True
        return False

    def mask_string(self, text: str) -> str:
        """
        Mask sensitive data in a string.
        Args:
            text: Input text that may contain sensitive data
        Returns:
            Text with sensitive data masked
        """
        if not text or not isinstance(text, str):
            return text
        masked_text = text
        # Labels whose patterns are heuristic free-text matches. For these we
        # require the captured value to look like a real credential before
        # masking it, otherwise ordinary sentences get clobbered.
        # (Format-anchored patterns such as ``sk-...`` or JWT keep their own
        # validation and are intentionally excluded here.)
        heuristic_labels = {
            "TOKEN",
            "SECRET",
            "API_KEY",
            "AUTH_TOKEN",
            "PASSWORD",
        }
        # Apply all patterns
        for pattern, label in self.compiled_patterns:

            def replace_match(match):
                # Handle different group patterns
                if len(match.groups()) == 1:
                    # Single group: entire match is sensitive
                    return self._mask_value(match.group(1))
                elif len(match.groups()) == 2:
                    # Two groups: first is context, second is sensitive value
                    prefix = match.group(1) if match.group(1) else ""
                    sensitive_value = match.group(2)
                    if label in heuristic_labels and not self._looks_like_credential(
                        sensitive_value
                    ):
                        # Don't mask low-entropy words that merely follow a
                        # sensitive-looking keyword in free text.
                        return match.group(0)
                    masked_value = self._mask_value(sensitive_value)
                    return f"{prefix}{masked_value}"
                elif len(match.groups()) >= 3:
                    # Multiple groups: first is context, second is sensitive value, third is suffix
                    prefix = match.group(1) if match.group(1) else ""
                    sensitive_value = match.group(2)
                    masked_value = self._mask_value(sensitive_value)
                    suffix = match.group(3) if match.group(3) else ""
                    return f"{prefix}{masked_value}{suffix}"
                return match.group(0)

            masked_text = pattern.sub(replace_match, masked_text)
        # Special handling for export statements with sensitive vars
        masked_text = self._mask_export_statements(masked_text)
        return masked_text

    def _mask_export_statements(self, text: str) -> str:
        """
        Mask values in export statements that contain sensitive environment variables.
        Args:
            text: Input text
        Returns:
            Text with export values masked
        """
        # Pattern: export VAR_NAME="value" or export VAR_NAME=value
        export_pattern = re.compile(
            r'(export\s+)([A-Z_][A-Z0-9_]*)(=)(["\']?)([^"\'\s]+)(["\']?)',
            re.IGNORECASE,
        )

        def replace_export(match):
            keyword = match.group(1)  # "export "
            var_name = match.group(2)  # Variable name
            equals = match.group(3)  # "="
            quote_start = match.group(4)  # Opening quote
            value = match.group(5)  # Value
            quote_end = match.group(6)  # Closing quote
            # First check if it matches non-sensitive patterns (should be excluded)
            is_non_sensitive = any(
                non_sensitive_pattern in var_name.upper()
                for non_sensitive_pattern in self.NON_SENSITIVE_PATTERNS
            )
            if is_non_sensitive:
                return match.group(0)
            # Check if this is a sensitive environment variable
            is_sensitive = any(
                sensitive_keyword in var_name.upper()
                for sensitive_keyword in self.SENSITIVE_ENV_VARS
            )
            if is_sensitive:
                masked_value = self._mask_value(value)
                return (
                    f"{keyword}{var_name}{equals}{quote_start}{masked_value}{quote_end}"
                )
            return match.group(0)

        return export_pattern.sub(replace_export, text)

    def mask_dict(self, data: Dict[str, Any], recursive: bool = True) -> Dict[str, Any]:
        """
        Mask sensitive data in a dictionary.
        Args:
            data: Dictionary that may contain sensitive data
            recursive: Whether to recursively mask nested dictionaries
        Returns:
            Dictionary with sensitive data masked
        """
        if not isinstance(data, dict):
            return data
        masked_data = {}
        for key, value in data.items():
            # First check if it matches non-sensitive patterns (should be excluded)
            is_non_sensitive = any(
                non_sensitive_pattern in key.upper()
                for non_sensitive_pattern in self.NON_SENSITIVE_PATTERNS
            )
            # Check if key name suggests sensitive data
            is_sensitive_key = (
                any(
                    sensitive_keyword in key.upper()
                    for sensitive_keyword in self.SENSITIVE_ENV_VARS
                )
                and not is_non_sensitive
            )
            if is_sensitive_key and isinstance(value, str):
                masked_data[key] = self._mask_value(value)
            elif isinstance(value, str):
                masked_data[key] = self.mask_string(value)
            elif isinstance(value, dict) and recursive:
                masked_data[key] = self.mask_dict(value, recursive=True)
            elif isinstance(value, (list, tuple)) and recursive:
                masked_data[key] = self.mask_list(value, recursive=True)
            else:
                masked_data[key] = value
        return masked_data

    def mask_list(self, data: List[Any], recursive: bool = True) -> List[Any]:
        """
        Mask sensitive data in a list.
        Args:
            data: List that may contain sensitive data
            recursive: Whether to recursively mask nested structures
        Returns:
            List with sensitive data masked
        """
        if not isinstance(data, (list, tuple)):
            return data
        masked_list = []
        for item in data:
            if isinstance(item, str):
                masked_list.append(self.mask_string(item))
            elif isinstance(item, dict) and recursive:
                masked_list.append(self.mask_dict(item, recursive=True))
            elif isinstance(item, (list, tuple)) and recursive:
                masked_list.append(self.mask_list(item, recursive=True))
            else:
                masked_list.append(item)
        return masked_list

    def mask_any(self, data: Any, recursive: bool = True) -> Any:
        """
        Automatically detect and mask sensitive data in any data type.
        Args:
            data: Data that may contain sensitive information
            recursive: Whether to recursively mask nested structures
        Returns:
            Data with sensitive information masked
        """
        if isinstance(data, str):
            return self.mask_string(data)
        elif isinstance(data, dict):
            return self.mask_dict(data, recursive=recursive)
        elif isinstance(data, (list, tuple)):
            return self.mask_list(data, recursive=recursive)
        else:
            return data


# Global singleton instance
_default_masker = SensitiveDataMasker()


def mask_sensitive_data(data: Any, recursive: bool = True) -> Any:
    """
    Convenience function to mask sensitive data using the default masker.
    Args:
        data: Data that may contain sensitive information
        recursive: Whether to recursively mask nested structures
    Returns:
        Data with sensitive information masked
    """
    return _default_masker.mask_any(data, recursive=recursive)


def mask_string(text: str) -> str:
    """
    Convenience function to mask sensitive data in a string.
    Args:
        text: Text that may contain sensitive data
    Returns:
        Text with sensitive data masked
    """
    return _default_masker.mask_string(text)
