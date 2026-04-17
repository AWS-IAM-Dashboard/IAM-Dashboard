"""
Shared validation helpers for API endpoints.
"""

import re

_UPPER_RE = re.compile(r"[A-Z]")
_LOWER_RE = re.compile(r"[a-z]")
_DIGIT_RE = re.compile(r"\d")


def validate_password(password: str) -> str | None:
    """Return an error message if the password is invalid, or None if it passes.

    Policy (matches frontend):
      - At least 8 characters
      - At least one uppercase letter
      - At least one lowercase letter
      - At least one digit
    """
    if len(password) < 8:
        return "Password must be at least 8 characters."
    if not _UPPER_RE.search(password):
        return "Password needs at least one uppercase letter."
    if not _LOWER_RE.search(password):
        return "Password needs at least one lowercase letter."
    if not _DIGIT_RE.search(password):
        return "Password needs at least one digit."
    return None
