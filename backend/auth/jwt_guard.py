"""
Optional HS256 JWT verification for API routes (stdlib only).

Secret resolution: ``JWT_SECRET``, then ``JWT_SECRET_KEY`` (common alternate name).

If no secret is configured, the view runs **unauthenticated** only when
``FLASK_ENV=development`` **or** ``ALLOW_INSECURE_JWT`` is truthy; otherwise the
handler returns **503** and the view is not invoked. When a secret is set,
``Authorization: Bearer <jwt>`` must carry a valid HS256 JWT.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
import time
from functools import wraps
from typing import Callable

from flask import jsonify, request

logger = logging.getLogger(__name__)


def _jwt_secret() -> str:
    """Return the configured HS256 signing secret, if any."""
    for key in ("JWT_SECRET", "JWT_SECRET_KEY"):
        raw = os.environ.get(key)
        if raw and str(raw).strip():
            return str(raw).strip()
    return ""


def _jwt_insecure_bypass_allowed() -> bool:
    """True only when operators explicitly allow running without JWT verification."""
    if os.environ.get("FLASK_ENV", "").strip().lower() == "development":
        return True
    flag = os.environ.get("ALLOW_INSECURE_JWT", "")
    return str(flag).strip().lower() in ("1", "true", "yes")


def _b64url_decode(data: str) -> bytes:
    pad = "=" * ((4 - len(data) % 4) % 4)
    return base64.urlsafe_b64decode(data + pad)


def verify_jwt_hs256(token: str, secret: str) -> bool:
    """Verify HS256 JWT signature and optional exp claim."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return False
        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
        expected_sig = hmac.new(
            secret.encode("utf-8"), signing_input, hashlib.sha256
        ).digest()
        try:
            sent_sig = _b64url_decode(sig_b64)
        except Exception:
            return False
        if not hmac.compare_digest(expected_sig, sent_sig):
            return False
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        exp = payload.get("exp")
        if exp is not None:
            try:
                if time.time() > float(exp):
                    return False
            except (TypeError, ValueError):
                return False
        return True
    except Exception:
        return False


def require_jwt(view_func: Callable):
    """Protect a view when a JWT secret is set; otherwise gated insecure bypass."""

    @wraps(view_func)
    def wrapped(*args, **kwargs):
        secret = _jwt_secret()
        if not secret:
            if _jwt_insecure_bypass_allowed():
                return view_func(*args, **kwargs)
            logger.critical(
                "JWT signing secret not configured (set JWT_SECRET or JWT_SECRET_KEY, "
                "or use FLASK_ENV=development / ALLOW_INSECURE_JWT only for local dev)"
            )
            return (
                jsonify(
                    {
                        "error": "Service unavailable",
                        "message": (
                            "JWT auth is not configured. Set JWT_SECRET or JWT_SECRET_KEY, "
                            "or set ALLOW_INSECURE_JWT=true for explicit non-production bypass."
                        ),
                    }
                ),
                503,
            )

        authz = request.headers.get("Authorization", "")
        if not authz.startswith("Bearer "):
            return jsonify({"error": "Unauthorized", "message": "Missing bearer token"}), 401
        token = authz[7:].strip()
        if not token or not verify_jwt_hs256(token, secret):
            logger.warning("JWT verification failed for %s", request.path)
            return jsonify({"error": "Unauthorized", "message": "Invalid or expired token"}), 401
        return view_func(*args, **kwargs)

    return wrapped
