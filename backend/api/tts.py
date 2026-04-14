"""
TTS endpoint — AWS Polly Neural TTS → audio/mpeg

POST /api/v1/tts/synthesize
  Body: { "text": "...", "voice": "Matthew", "engine": "neural" }
  Response: audio/mpeg binary on success, JSON {error, fallback:true} on failure

In mock/dev mode (DATA_MODE=mock) returns 503 fallback so the frontend
falls back to the browser's Web Speech API automatically.
"""

import os
import logging

from flask import request, Response
from flask_restful import Resource

logger = logging.getLogger(__name__)

try:
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError
    _BOTO3_OK = True
except ImportError:
    _BOTO3_OK = False

# Voices supported by Polly Neural engine that are appropriate for SOC tooling.
_ALLOWED_VOICES = {"Matthew", "Joanna", "Stephen", "Ruth", "Brian", "Emma"}
_MAX_CHARS = 3_000


def _is_mock_mode() -> bool:
    for key in ("DATA_MODE", "VITE_DATA_MODE"):
        if (os.getenv(key) or "").strip().lower() == "mock":
            return True
    return False


class TTSSynthesizeResource(Resource):
    """POST /api/v1/tts/synthesize — Polly Neural TTS."""

    def post(self):
        data = request.get_json(silent=True) or {}
        text: str = (data.get("text") or "").strip()
        voice: str = data.get("voice", "Matthew")
        engine: str = data.get("engine", "neural")

        if not text:
            return {"error": "text is required"}, 400

        # Sanitise inputs
        if voice not in _ALLOWED_VOICES:
            voice = "Matthew"
        if engine not in ("neural", "standard"):
            engine = "neural"
        if len(text) > _MAX_CHARS:
            text = text[:_MAX_CHARS]

        # Return fallback signal in mock/dev mode so frontend uses Web Speech API
        if _is_mock_mode():
            return {"error": "mock mode — use browser TTS fallback", "fallback": True}, 503

        if not _BOTO3_OK:
            return {"error": "boto3 not installed", "fallback": True}, 503

        try:
            region = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
            polly = boto3.client("polly", region_name=region)
            resp = polly.synthesize_speech(
                Text=text,
                OutputFormat="mp3",
                VoiceId=voice,
                Engine=engine,
            )
            audio_bytes: bytes = resp["AudioStream"].read()
            return Response(audio_bytes, mimetype="audio/mpeg", status=200)

        except (BotoCoreError, ClientError) as exc:
            logger.warning("Polly synthesis failed: %s", exc)
            return {"error": "synthesis unavailable", "fallback": True}, 503

        except Exception as exc:  # pylint: disable=broad-except
            logger.error("Unexpected TTS error: %s", exc)
            return {"error": "internal error", "fallback": True}, 503
