"""
voice_intent.py — Bedrock intent fallback for Argus Voice IR Agent

POST /api/v1/voice/intent
  Called only when client-side regex matchIntent() returns "unknown".

  Request:  { utterance, context_turns[{role, text}], finding_context }
  Response: { intent, spoken_reply, args, confidence }
  Fallback: { error: "bedrock_unavailable", fallback: true } → 503
"""

import json
import logging

from flask import request, jsonify
from flask_restful import Resource
from api.ir import _invoke_claude
from api.text_utils import strip_code_fences

logger = logging.getLogger(__name__)

VALID_INTENTS = {
    "briefing", "critical", "threat", "sla", "latest",
    "show_findings", "compliance", "scan", "help", "high",
    "isolate", "revoke", "disable_key", "navigate", "unknown",
}

SYSTEM_VOICE_INTENT = (
    "You are Argus, a voice-driven cloud security IR agent for an AWS security operations dashboard. "
    "The user has spoken a command that the regex intent matcher could not classify. "
    "Classify the utterance into exactly one of these intents: "
    "briefing, critical, threat, sla, latest, show_findings, compliance, scan, "
    "help, high, isolate, revoke, disable_key, navigate, unknown. "
    "You MUST respond with ONLY a valid JSON object — no markdown, no prose, no code fences. "
    'Schema: {"intent": <string>, "spoken_reply": <string|null>, "args": <object|null>, "confidence": <float 0-1>}. '
    "spoken_reply: a short, direct military-style spoken response (max 2 sentences) for TTS. "
    "Set to null if intent is unknown. Reference the finding context if relevant to the operator's goal. "
    "args: structured parameters extracted from the utterance (e.g. {\"resource\": \"i-0abc123\"}) or null if none. "
    "High-impact intents (isolate, revoke) must only be returned if the utterance contains clear containment language. "
    "Do not include any text outside the JSON object."
)

_BEDROCK_UNAVAILABLE = {"error": "bedrock_unavailable", "fallback": True}


class VoiceIntentResource(Resource):
    """POST /api/v1/voice/intent — Bedrock intent classification fallback."""

    def post(self):
        # Do not gate on BEDROCK_API_KEY here — _invoke_claude() handles credential
        # discovery (API key, IAM role, env vars) and returns None if unavailable.
        data = request.get_json(force=True, silent=True) or {}
        utterance: str = (data.get("utterance") or "").strip()
        if not utterance:
            return {"error": "utterance is required"}, 400

        context_turns = (data.get("context_turns") or [])[-3:]
        finding_context = data.get("finding_context") or None

        # Build user prompt
        parts = []

        if finding_context:
            sev   = (finding_context.get("severity") or "UNKNOWN").upper()
            ftype = finding_context.get("finding_type") or "Unknown finding"
            rsrc  = finding_context.get("resource_name") or "Unknown resource"
            svc   = finding_context.get("service") or "aws"
            parts.append(
                f"Active finding context: severity={sev}, type={ftype!r}, "
                f"resource={rsrc!r}, service={svc}."
            )

        if context_turns:
            parts.append("Recent conversation (oldest first):")
            for t in context_turns:
                role = t.get("role", "user")
                text = (t.get("text") or "").strip()
                if text:
                    parts.append(f"  [{role}]: {text}")

        parts.append(f'Classify: "{utterance}"')
        prompt = "\n".join(parts)

        raw = _invoke_claude(prompt, system=SYSTEM_VOICE_INTENT, max_tokens=256)
        if not raw:
            logger.warning("VoiceIntent: _invoke_claude returned None for utterance %r", utterance[:80])
            return _BEDROCK_UNAVAILABLE, 503

        text = strip_code_fences(raw)

        try:
            result = json.loads(text)
        except json.JSONDecodeError as exc:
            logger.warning("VoiceIntent JSON parse failed: %s | raw=%r", exc, raw[:200])
            return _BEDROCK_UNAVAILABLE, 503

        if not isinstance(result, dict):
            logger.warning("VoiceIntent: model returned non-object JSON — raw=%r", raw[:200])
            return _BEDROCK_UNAVAILABLE, 503

        intent = str(result.get("intent", "unknown"))
        if intent not in VALID_INTENTS:
            logger.warning("VoiceIntent returned unmapped intent %r — coercing to unknown", intent)
            intent = "unknown"

        spoken_reply = result.get("spoken_reply") or None
        if spoken_reply:
            spoken_reply = str(spoken_reply)[:500]

        args = result.get("args")
        if args and not isinstance(args, dict):
            args = None

        try:
            confidence = float(result.get("confidence", 0.0))
            confidence = max(0.0, min(1.0, confidence))
        except (TypeError, ValueError):
            confidence = 0.0

        return {
            "intent":       intent,
            "spoken_reply": spoken_reply,
            "args":         args,
            "confidence":   confidence,
        }, 200
