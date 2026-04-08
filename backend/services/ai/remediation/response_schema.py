from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Tuple

try:
    from jsonschema import Draft7Validator
except Exception:  # pragma: no cover - fallback if dependency is unavailable
    Draft7Validator = None  # type: ignore[assignment]


_SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schemas" / "remediation_response.json"


@lru_cache(maxsize=1)
def get_remediation_schema() -> Dict[str, Any]:
    with _SCHEMA_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


@lru_cache(maxsize=1)
def _get_schema_validator():
    schema = get_remediation_schema()
    if Draft7Validator is not None:
        return Draft7Validator(schema)
    return None


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

    Validate against runtime JSON schema loaded from
    backend/services/ai/schemas/remediation_response.json.
    """
    schema = get_remediation_schema()
    validator = _get_schema_validator()

    if validator is not None:
        errors = sorted(validator.iter_errors(response), key=lambda e: list(e.path))
        if errors:
            return False, [e.message for e in errors]
        return True, []

    # Fallback (if jsonschema package isn't available): enforce a minimal subset
    # from the loaded schema, including required fields and additionalProperties=false.
    errors: List[str] = []
    if not isinstance(response, dict):
        return False, ["response must be an object"]

    required_fields = schema.get("required", [])
    for field in required_fields:
        if field not in response:
            errors.append(f"missing field: {field}")

    if errors:
        return False, errors

    if schema.get("additionalProperties") is False:
        allowed = set((schema.get("properties") or {}).keys())
        extra = sorted(k for k in response.keys() if k not in allowed)
        for key in extra:
            errors.append(f"additional properties are not allowed ('{key}' was unexpected)")

    risk_enum = set(
        (((schema.get("properties") or {}).get("risk_level") or {}).get("enum") or [])
    )

    if not isinstance(response.get("type"), str) or not response["type"].strip():
        errors.append("`type` must be a non-empty string")

    if response.get("risk_level") not in risk_enum:
        errors.append("`risk_level` must be one of low|medium|high")

    if not isinstance(response.get("explanation"), str) or not response["explanation"].strip():
        errors.append("`explanation` must be a non-empty string")

    proposed_change = response.get("proposed_change")
    if not isinstance(proposed_change, (dict, list)):
        errors.append("`proposed_change` must be an object or list")

    if response.get("requires_review") is not True:
        errors.append("`requires_review` must be true")

    if not isinstance(response.get("blocked"), bool):
        errors.append("`blocked` must be boolean")

    violations = response.get("violations")
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

