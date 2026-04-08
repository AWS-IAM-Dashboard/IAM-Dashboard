from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Tuple

from services.ai.remediation.input_adapter import NormalizedAi2Input
from services.ai.remediation.response_schema import (
    make_response,
    validate_response_block_invariants,
    validate_response_schema,
)


# Input stage caps: keep work bounded and reduce prompt-injection surface.
MAX_AI2_TOTAL_CHARS = 30000
MAX_POLICY_SNIPPET_CHARS = 20000


# Safety violations (rule ids surfaced to UI / logs).
PROMPT_INJECTION_VIOLATION = "PROMPT_INJECTION_DETECTED"
SCHEMA_VALIDATION_FAILED = "SCHEMA_VALIDATION_FAILED"

BANNED_WILDCARD_ACTION = "BANNED_WILDCARD_ACTION"
BANNED_WILDCARD_RESOURCE = "BANNED_WILDCARD_RESOURCE"
BANNED_ADMINISTRATORACCESS = "BANNED_ADMINISTRATORACCESS"
BANNED_PRINCIPAL_STAR = "BANNED_PRINCIPAL_STAR"
BANNED_WILDCARD_ACTION_FIELD = "BANNED_WILDCARD_ACTION_FIELD"
BANNED_WILDCARD_RESOURCE_FIELD = "BANNED_WILDCARD_RESOURCE_FIELD"
BANNED_PRINCIPAL_STAR_FIELD = "BANNED_PRINCIPAL_STAR_FIELD"


_PROMPT_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+previous\s+instructions", re.IGNORECASE),
    re.compile(r"\bsystem\s+prompt\b", re.IGNORECASE),
    re.compile(r"\bdeveloper\s+message\b", re.IGNORECASE),
    re.compile(r"<\s*script\b", re.IGNORECASE),
    re.compile(r"\bcurl\s+", re.IGNORECASE),
]


def _count_total_input_chars(ai2_input: Dict[str, Any]) -> int:
    try:
        return len(json.dumps(ai2_input, default=str))
    except Exception:
        return 999999


def input_check(ai2_input_raw: Dict[str, Any], normalized: NormalizedAi2Input) -> Tuple[bool, List[str]]:
    """
    Stage 1: input check
    - cap input sizes
    - reject obvious prompt injection patterns
    """
    violations: List[str] = []

    if _count_total_input_chars(ai2_input_raw) > MAX_AI2_TOTAL_CHARS:
        return False, ["INPUT_TOO_LARGE"]

    policy_snippet = normalized.policy_snippet
    try:
        snippet_len = len(json.dumps(policy_snippet, default=str))
    except Exception:
        snippet_len = MAX_POLICY_SNIPPET_CHARS + 1
    if snippet_len > MAX_POLICY_SNIPPET_CHARS:
        return False, ["POLICY_SNIPPET_TOO_LARGE"]

    # Prompt injection detection: scan all string-like content in the input.
    def walk(x: Any) -> List[str]:
        if isinstance(x, str):
            return [x]
        if isinstance(x, dict):
            out: List[str] = []
            for v in x.values():
                out.extend(walk(v))
            return out
        if isinstance(x, list):
            out = []
            for v in x:
                out.extend(walk(v))
            return out
        return []

    for s in walk(ai2_input_raw):
        for pat in _PROMPT_INJECTION_PATTERNS:
            if pat.search(s):
                violations.append(PROMPT_INJECTION_VIOLATION)
                return False, list(sorted(set(violations)))

    return True, []


def _walk_values(x: Any) -> List[Any]:
    out: List[Any] = []
    if isinstance(x, dict):
        for v in x.values():
            out.extend(_walk_values(v))
    elif isinstance(x, list):
        for v in x:
            out.extend(_walk_values(v))
    else:
        out.append(x)
    return out


def _contains_wildcard_string(value: Any) -> bool:
    return isinstance(value, str) and value.strip() in {"*", "*:*"} or (
        isinstance(value, str) and re.match(r"^[a-z0-9-]+:\*$", value.strip(), re.IGNORECASE)
    )


def _contains_broad_resource_wildcard(value: Any) -> bool:
    if not isinstance(value, str):
        return False

    normalized = value.strip()
    if not normalized:
        return False

    # Keep parity with existing broad wildcard forms.
    if _contains_wildcard_string(normalized):
        return True

    # Match account-wide wildcard in ARN account segment: arn:partition:service:region:*:...
    # and path/object globs like .../*.
    return (
        bool(re.search(r"^arn:[^:]+:[^:]*:[^:]*:\*:", normalized, re.IGNORECASE))
        or "/*" in normalized
    )


def _contains_wildcard_in_policy_field(statement: Any, field_name: str, matcher: Any) -> bool:
    if not isinstance(statement, dict):
        return False

    value = statement.get(field_name)
    if value is None:
        return False

    if isinstance(value, list):
        return any(matcher(item) for item in value)

    return matcher(value)


def _extract_statement_list(proposed_change: Dict[str, Any]) -> List[Any]:
    statements = proposed_change.get("Statement")
    if isinstance(statements, dict):
        return [statements]
    if isinstance(statements, list):
        return statements
    return []


def _principal_contains_star(value: Any) -> bool:
    if isinstance(value, str):
        return value.strip() == "*"
    if isinstance(value, list):
        return any(_principal_contains_star(item) for item in value)
    if isinstance(value, dict):
        return any(_principal_contains_star(v) for v in value.values())
    return False


def safety_filter(candidate_response: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Stage 4: safety filter (banned recommendation detection).

    We scan the *proposed_change* for dangerous IAM patterns:
    - Action/Resource wildcards
    - AdministratorAccess mentions
    - trust policies with Principal == "*"
    """
    violations: List[str] = []
    granular_violations: List[str] = []

    proposed_change = candidate_response.get("proposed_change")
    if isinstance(proposed_change, dict):
        # Inspect structured policy-like output.
        values = _walk_values(proposed_change)

        # AdministratorAccess is banned regardless of where it appears.
        if any(isinstance(v, str) and "AdministratorAccess" in v for v in values):
            violations.append(BANNED_ADMINISTRATORACCESS)

        # Wildcards in Action/NotAction.
        statement_list = _extract_statement_list(proposed_change)

        has_action_wildcard = any(
            _contains_wildcard_in_policy_field(stmt, "Action", _contains_wildcard_string)
            or _contains_wildcard_in_policy_field(stmt, "NotAction", _contains_wildcard_string)
            for stmt in statement_list
        )
        if has_action_wildcard:
            violations.append(BANNED_WILDCARD_ACTION)
            granular_violations.append(BANNED_WILDCARD_ACTION_FIELD)

        # Broad wildcards in Resource/NotResource, including ARN account/path globs.
        has_resource_wildcard = any(
            _contains_wildcard_in_policy_field(stmt, "Resource", _contains_broad_resource_wildcard)
            or _contains_wildcard_in_policy_field(stmt, "NotResource", _contains_broad_resource_wildcard)
            for stmt in statement_list
        )
        if has_resource_wildcard:
            violations.append(BANNED_WILDCARD_RESOURCE)
            granular_violations.append(BANNED_WILDCARD_RESOURCE_FIELD)

        # Principal: "*" is banned in trust policy fields only.
        has_principal_star = any(
            _principal_contains_star(stmt.get("Principal")) for stmt in statement_list if isinstance(stmt, dict)
        )
        if has_principal_star:
            violations.append(BANNED_PRINCIPAL_STAR)
            granular_violations.append(BANNED_PRINCIPAL_STAR_FIELD)

    # If proposed_change is a list (operational steps), we keep it simple:
    # disallow disabling security controls by searching for common phrases.
    elif isinstance(proposed_change, list):
        joined = " ".join(s for s in proposed_change if isinstance(s, str)).lower()
        if "disable mfa" in joined or "turn off mfa" in joined:
            violations.append("BANNED_WEAKEN_MFA")

    if violations or granular_violations:
        return False, sorted(set(violations + granular_violations))
    return True, []


def safe_blocked_response(violations: List[str], *, explanation: str | None = None) -> Dict[str, Any]:
    return make_response(
        fix_type="blocked_request",
        risk_level="high",
        explanation=explanation
        or "This remediation request was blocked by AI guardrails. Review the violations and adjust the request content.",
        proposed_change=[],
        blocked=True,
        violations=violations,
    )


def apply_guardrails(
    *,
    ai2_input_raw: Dict[str, Any],
    normalized_input: NormalizedAi2Input,
    candidate_response: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Full AI-3 pipeline in code:
    - Stage 1: input check
    - Stage 3: schema validation
    - Stage 4: safety filter
    """
    # Stage 1
    ok, input_violations = input_check(ai2_input_raw, normalized_input)
    if not ok:
        return safe_blocked_response(input_violations)

    # Stage 3
    ok_schema, schema_errors = validate_response_schema(candidate_response)
    if not ok_schema:
        return safe_blocked_response(schema_errors + [SCHEMA_VALIDATION_FAILED])

    ok_invariants, invariant_errors = validate_response_block_invariants(candidate_response)
    if not ok_invariants:
        return safe_blocked_response(invariant_errors)

    # Stage 4
    ok_safety, safety_violations = safety_filter(candidate_response)
    if not ok_safety:
        return safe_blocked_response(safety_violations, explanation="Guardrails blocked an unsafe remediation suggestion.")

    return candidate_response

