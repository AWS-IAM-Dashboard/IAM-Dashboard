from __future__ import annotations

from typing import Any, Dict, List, Tuple


RISK_LEVELS = {"low", "medium", "high"}


def make_response(
    *,
    fix_type: str,
    risk_level: str,
    explanation: str,
    proposed_change: Any,
    blocked: bool = False,
    violations: List[str] | None = None,
) -> Dict[str, Any]:
    """
    Create a remediation response that matches the fixed AI-3 structure.

    Note: `requires_review` is always true per AI-3 guardrails.
    """
    if violations is None:
        violations = []
    return {
        "type": fix_type,
        "risk_level": risk_level,
        "explanation": explanation,
        "proposed_change": proposed_change,
        "requires_review": True,
        "blocked": blocked,
        "violations": violations,
    }


def validate_response_schema(response: Any) -> Tuple[bool, List[str]]:
    """
    Stage 3 of AI-3 pipeline: deterministic schema validation.

    We don't rely on any external schema libs; this keeps lambda packaging minimal.
    """
    errors: List[str] = []
    if not isinstance(response, dict):
        return False, ["response must be an object"]

    required_fields = [
        "type",
        "risk_level",
        "explanation",
        "proposed_change",
        "requires_review",
        "blocked",
        "violations",
    ]
    for field in required_fields:
        if field not in response:
            errors.append(f"missing field: {field}")

    if errors:
        return False, errors

    if not isinstance(response["type"], str) or not response["type"].strip():
        errors.append("`type` must be a non-empty string")

    if response["risk_level"] not in RISK_LEVELS:
        errors.append("`risk_level` must be one of low|medium|high")

    if not isinstance(response["explanation"], str) or not response["explanation"].strip():
        errors.append("`explanation` must be a non-empty string")

    proposed_change = response["proposed_change"]
    if not isinstance(proposed_change, (dict, list)):
        errors.append("`proposed_change` must be an object or list")

    if response["requires_review"] is not True:
        errors.append("`requires_review` must be true")

    if not isinstance(response["blocked"], bool):
        errors.append("`blocked` must be boolean")

    violations = response["violations"]
    if not isinstance(violations, list) or not all(isinstance(v, str) for v in violations):
        errors.append("`violations` must be a list of strings")

    return len(errors) == 0, errors


def validate_response_block_invariants(response: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Extra invariant checks:
    - If blocked=true, violations must be non-empty
    """
    errors: List[str] = []
    if response.get("blocked") is True and not response.get("violations"):
        errors.append("blocked=true requires non-empty violations")
    return len(errors) == 0, errors

