from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class NormalizedAi2Input:
    """
    Normalized internal representation of AI-2 input schema.

    The remediation engine should operate on this stable structure so:
    - guardrails and validators have predictable fields
    - finding-type routing doesn't deal with nested optional JSON
    """

    finding_id: Optional[str]
    finding_type: str
    severity: str
    scanner_source: Optional[str]
    resource_type: str
    resource_name: str
    policy_snippet: Any
    account_id: str
    iam_relationships: Dict[str, Any]
    related_findings: List[str]


def _get(obj: Dict[str, Any], key: str, default: Any = None) -> Any:
    return obj.get(key, default) if isinstance(obj, dict) else default


def normalize_ai2_input(ai2_input: Dict[str, Any]) -> NormalizedAi2Input:
    """
    Convert AI-2 payload into a flattened, predictable internal structure.

    Validation is intentionally strict on required fields that drive routing.
    """
    if not isinstance(ai2_input, dict):
        raise ValueError("AI-2 input must be a JSON object")

    finding_details = ai2_input.get("finding_details")
    environment_context = ai2_input.get("environment_context")
    if not isinstance(finding_details, dict):
        raise ValueError("AI-2 input missing `finding_details` object")
    if not isinstance(environment_context, dict):
        raise ValueError("AI-2 input missing `environment_context` object")

    finding_type = _get(finding_details, "finding_type")
    severity = _get(finding_details, "severity")
    resource = _get(finding_details, "resource", {})

    if not isinstance(finding_type, str) or not finding_type.strip():
        raise ValueError("AI-2 input missing `finding_details.finding_type`")
    if not isinstance(severity, str) or not severity.strip():
        raise ValueError("AI-2 input missing `finding_details.severity`")
    if not isinstance(resource, dict):
        raise ValueError("AI-2 input missing `finding_details.resource` object")

    resource_type = _get(resource, "resource_type", "") or "unknown"
    resource_name = _get(resource, "resource_name", "") or "unknown"
    policy_snippet = _get(resource, "policy_snippet", None)

    account_id = _get(environment_context, "account_id")
    if not isinstance(account_id, str) or not account_id.strip():
        raise ValueError("AI-2 input missing `environment_context.account_id`")

    iam_relationships = _get(environment_context, "iam_relationships", {})
    if not isinstance(iam_relationships, dict):
        iam_relationships = {}

    related_findings = _get(environment_context, "related_findings", [])
    if not isinstance(related_findings, list):
        related_findings = []
    related_findings = [x for x in related_findings if isinstance(x, str)]

    return NormalizedAi2Input(
        finding_id=_get(finding_details, "finding_id"),
        finding_type=finding_type,
        severity=severity,
        scanner_source=_get(finding_details, "scanner_source"),
        resource_type=resource_type,
        resource_name=resource_name,
        policy_snippet=policy_snippet,
        account_id=account_id,
        iam_relationships=iam_relationships,
        related_findings=related_findings,
    )

