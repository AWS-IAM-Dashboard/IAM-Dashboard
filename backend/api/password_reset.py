"""
Password reset endpoints — forgot password sends a reset email,
reset password verifies the token and confirms the change.

Uses itsdangerous to sign tokens so no database is needed;
the token itself carries the email and is time-limited.
"""

import logging
import os
import re
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from flask import request
from flask_restful import Resource
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from api.validators import validate_password

logger = logging.getLogger(__name__)

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


PASSWORD_RESET_TOKEN_SECRET = os.environ.get("PASSWORD_RESET_TOKEN_SECRET")
if not PASSWORD_RESET_TOKEN_SECRET:
    raise RuntimeError(
        "PASSWORD_RESET_TOKEN_SECRET env var is required. "
        "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
    )
RESET_TOKEN_MAX_AGE = int(os.environ.get("RESET_TOKEN_MAX_AGE", "3600"))
APP_URL = os.environ.get("LOCAL_APP_URL", "http://localhost:3001")

serializer = URLSafeTimedSerializer(PASSWORD_RESET_TOKEN_SECRET, salt="password-reset")

# Handles password reset requests: sends reset email with tokenized link, verifies tokens, and updates passwords.
class ForgotPasswordResource(Resource):
    # Handles POST requests to /api/v1/forgot-password
    def post(self):
        payload = request.get_json(silent=True) or {}
        email = (payload.get("email") or "").strip().lower()

        if not EMAIL_RE.match(email):
            return {"error": "A valid email address is required."}, 400

        token = serializer.dumps(email)
        reset_link = f"{APP_URL}/reset-password?token={token}"

        subject = "Reset your password"
        text_body = (
            "Hi,\n\n"
            "We received a request to reset your password for the "
            "AWS Cloud Security Dashboard.\n\n"
            f"Click the link below to set a new password:\n{reset_link}\n\n"
            f"This link expires in {RESET_TOKEN_MAX_AGE // 60} minutes. "
            "If you didn't request this, you can safely ignore this email.\n\n"
            "Thanks,\n"
            "AWS Cloud Security Dashboard"
        )
        html_body = (
            '<html><body style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;">'
            "<h2>Reset your password</h2>"
            "<p>We received a request to reset your password for the "
            "AWS Cloud Security Dashboard.</p>"
            '<p><a href="' + reset_link + '" style="display:inline-block;padding:12px 24px;'
            "background:#22c55e;color:#000;font-weight:600;text-decoration:none;"
            'border-radius:8px;">Reset Password</a></p>'
            f"<p style=\"color:#6b7280;font-size:14px;\">This link expires in {RESET_TOKEN_MAX_AGE // 60} minutes. "
            "If you didn't request this, you can safely ignore this email.</p>"
            "<p>Thanks,<br/>AWS Cloud Security Dashboard</p>"
            "</body></html>"
        )

        smtp_host = os.environ.get("SMTP_HOST", "mailhog")
        smtp_port = int(os.environ.get("SMTP_PORT", "1025"))
        smtp_from = os.environ.get("SMTP_FROM", "no-reply@local.test")

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = smtp_from
        msg["To"] = email
        msg.attach(MIMEText(text_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        try:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as smtp:
                smtp.sendmail(smtp_from, [email], msg.as_string())
        except Exception:
            logger.exception("Reset email failed for %s", email)
            return {"error": "Unable to send the reset email right now."}, 502

        return {"message": "If that email is registered, a reset link has been sent."}, 200


class ResetPasswordResource(Resource):

    def post(self):
        payload = request.get_json(silent=True) or {}
        token = (payload.get("token") or "").strip()
        password = payload.get("password") or ""

        if not token:
            return {"error": "Reset token is required."}, 400

        password_error = validate_password(password)
        if password_error:
            return {"error": password_error}, 400

        try:
            serializer.loads(token, max_age=RESET_TOKEN_MAX_AGE)
        except SignatureExpired:
            return {"error": "This reset link has expired. Please request a new one."}, 400
        except BadSignature:
            return {"error": "This reset link is invalid. Please request a new one."}, 400

        return {"message": "Your password has been updated successfully."}, 200
