"""
Signup endpoint — sends a welcome email on successful form submission.
"""

import html
import logging
import os
import re
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from flask import request
from flask_restful import Resource

logger = logging.getLogger(__name__)

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class SignupWelcomeEmailResource(Resource):

    def post(self):
        payload = request.get_json(silent=True) or {}
        name = (payload.get("name") or "").strip()
        email = (payload.get("email") or "").strip().lower()

        if not name:
            return {"error": "Name is required."}, 400
        if not EMAIL_RE.match(email):
            return {"error": "A valid email address is required."}, 400

        subject = "Welcome to the AWS Cloud Security Dashboard"
        text_body = (
            f"Hi {name},\n\n"
            "Your account has been created successfully on the "
            "AWS Cloud Security Dashboard.\n\n"
            "You can now sign in and start monitoring your cloud "
            "security posture.\n\n"
            "Thanks,\n"
            "AWS Cloud Security Dashboard"
        )
        safe_name = html.escape(name)
        html_body = (
            '<html><body style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;">'
            f"<h2>Welcome, {safe_name}</h2>"
            "<p>Your account has been created successfully on the "
            "AWS Cloud Security Dashboard.</p>"
            "<p>You can now sign in and start monitoring your cloud "
            "security posture.</p>"
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
            logger.exception("Welcome email failed for %s", email)
            return {"error": "Unable to send the welcome email right now."}, 502

        return {"message": "Account created successfully. A welcome email has been sent."}, 201
