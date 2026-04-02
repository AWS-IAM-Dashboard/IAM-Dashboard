from __future__ import annotations

from typing import Any, Dict

from services.ai.remediation.guardrails import apply_guardrails
from services.ai.remediation.input_adapter import normalize_ai2_input
from services.ai.remediation.router import route_remediation


def generate_remediation(ai2_input_raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    AI-5 remediation generation (deterministic MVP) + AI-3 guardrails.

    Pipeline order:
    1) Normalize AI-2 input
    2) Route to finding-type remediation template
    3) Validate + safety filter to produce the fixed AI-3 response object
    """
    normalized = normalize_ai2_input(ai2_input_raw)
    candidate_response = route_remediation(normalized)
    final_response = apply_guardrails(
        ai2_input_raw=ai2_input_raw,
        normalized_input=normalized,
        candidate_response=candidate_response,
    )
    return final_response

