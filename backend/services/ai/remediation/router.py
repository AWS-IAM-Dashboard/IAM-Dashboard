from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

from services.ai.remediation.input_adapter import NormalizedAi2Input
from services.ai.remediation.response_schema import make_response


TOP10_FINDING_TYPES: List[str] = [
    "admin_access",
    "wildcard_permissions",
    "service_wildcard_permissions",
    "wildcard_resource",
    "public_trust_policy",
    "external_account_access",
    "iam_privilege_escalation",
    "missing_mfa",
    "old_access_key",
    "unused_access_key",
]


def _norm_finding_type(value: str) -> str:
    # Scanner uses snake_case; normalize defensively.
    return value.strip().lower()


def _infer_service_from_policy_snippet(policy_snippet: Any) -> Optional[str]:
    """
    Best-effort inference for finding types like `service_wildcard_permissions`.

    Looks for values like `s3:*` / `lambda:*` anywhere inside policy_snippet.
    """

    if policy_snippet is None:
        return None

    service_wildcard_re = re.compile(r"^([a-z0-9-]+):\*$", re.IGNORECASE)

    def walk(x: Any) -> List[str]:
        out: List[str] = []
        if isinstance(x, str):
            out.append(x)
        elif isinstance(x, dict):
            for v in x.values():
                out.extend(walk(v))
        elif isinstance(x, list):
            for v in x:
                out.extend(walk(v))
        return out

    for s in walk(policy_snippet):
        m = service_wildcard_re.match(s.strip())
        if m:
            # Turn `s3` into `S3`, `kms` into `KMS`, etc.
            return m.group(1).upper().replace("-", "_")
    return None


def _risk_level_from_severity(severity: str) -> str:
    s = severity.strip().lower()
    if s in {"critical", "high"}:
        return "high"
    if s in {"medium", "med"}:
        return "medium"
    return "low"


def route_remediation(input_: NormalizedAi2Input) -> Dict[str, Any]:
    finding_type = _norm_finding_type(input_.finding_type)
    risk_level = _risk_level_from_severity(input_.severity)

    if finding_type == "admin_access":
        return _remediate_admin_access(input_, risk_level)
    if finding_type == "wildcard_permissions":
        return _remediate_wildcard_permissions(input_, risk_level)
    if finding_type == "service_wildcard_permissions":
        return _remediate_service_wildcard_permissions(input_, risk_level)
    if finding_type == "wildcard_resource":
        return _remediate_wildcard_resource(input_, risk_level)
    if finding_type == "public_trust_policy":
        return _remediate_public_trust_policy(input_, risk_level)
    if finding_type == "external_account_access":
        return _remediate_external_account_access(input_, risk_level)
    if finding_type == "iam_privilege_escalation":
        return _remediate_iam_privilege_escalation(input_, risk_level)
    if finding_type == "missing_mfa":
        return _remediate_missing_mfa(input_, risk_level)
    if finding_type == "old_access_key":
        return _remediate_old_access_key(input_, risk_level)
    if finding_type == "unused_access_key":
        return _remediate_unused_access_key(input_, risk_level)

    # Out of scope (guardrails will handle blocking later)
    return make_response(
        fix_type="out_of_scope",
        risk_level="low",
        explanation=f"Unsupported finding_type: {input_.finding_type}. Only the project's top 10 IAM finding types are handled in this sprint.",
        proposed_change=[],
        blocked=True,
        violations=["UNSUPPORTED_FINDING_TYPE"],
    )


def _remediate_admin_access(input_: NormalizedAi2Input, risk_level: str) -> Dict[str, Any]:
    return make_response(
        fix_type="iam_policy",
        risk_level=risk_level,
        explanation=f"{input_.resource_type} '{input_.resource_name}' has AdministratorAccess. Replace it with a least-privilege policy tailored to its actual needs.",
        proposed_change={
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "LeastPrivilegeReplaceAdministratorAccess",
                    "Effect": "Allow",
                    "Action": ["REPLACE_WITH_LEAST_PRIVILEGE_ACTIONS"],
                    "Resource": ["REPLACE_WITH_TIGHTENED_RESOURCE_ARNS"],
                }
            ],
        },
        blocked=False,
        violations=[],
    )


def _remediate_wildcard_permissions(input_: NormalizedAi2Input, risk_level: str) -> Dict[str, Any]:
    return make_response(
        fix_type="iam_policy",
        risk_level=risk_level,
        explanation=f"{input_.resource_type} '{input_.resource_name}' includes wildcard IAM actions. Remove broad wildcards and enumerate only the required actions for least privilege.",
        proposed_change={
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "LeastPrivilegeReplaceWildcardActions",
                    "Effect": "Allow",
                    "Action": ["REPLACE_WITH_ALLOWED_ACTIONS"],
                    "Resource": ["REPLACE_WITH_TIGHTENED_RESOURCE_ARNS"],
                }
            ],
        },
        blocked=False,
        violations=[],
    )


def _remediate_service_wildcard_permissions(input_: NormalizedAi2Input, risk_level: str) -> Dict[str, Any]:
    service = _infer_service_from_policy_snippet(input_.policy_snippet) or "SERVICE"
    actions_placeholder = f"REPLACE_WITH_{service}_ALLOWED_ACTIONS"

    return make_response(
        fix_type="iam_policy",
        risk_level=risk_level,
        explanation=f"{input_.resource_type} '{input_.resource_name}' allows a whole service via wildcard actions (e.g., {service.lower()}:*). Restrict to only the specific {service} actions required.",
        proposed_change={
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "LeastPrivilegeReplaceServiceWildcardActions",
                    "Effect": "Allow",
                    "Action": [actions_placeholder],
                    "Resource": ["REPLACE_WITH_TIGHTENED_RESOURCE_ARNS"],
                }
            ],
        },
        blocked=False,
        violations=[],
    )


def _remediate_wildcard_resource(input_: NormalizedAi2Input, risk_level: str) -> Dict[str, Any]:
    return make_response(
        fix_type="iam_policy",
        risk_level=risk_level,
        explanation=f"{input_.resource_type} '{input_.resource_name}' uses overly broad Resource scope. Replace Resource='*' with specific ARNs (or tightly-scoped patterns) for least privilege.",
        proposed_change={
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "LeastPrivilegeReplaceWildcardResource",
                    "Effect": "Allow",
                    "Action": ["REPLACE_WITH_REQUIRED_ACTIONS"],
                    "Resource": ["REPLACE_WITH_TIGHTENED_RESOURCE_ARNS"],
                }
            ],
        },
        blocked=False,
        violations=[],
    )


def _remediate_public_trust_policy(input_: NormalizedAi2Input, risk_level: str) -> Dict[str, Any]:
    return make_response(
        fix_type="trust_policy",
        risk_level=risk_level,
        explanation=f"{input_.resource_type} '{input_.resource_name}' has a trust relationship that can be assumed publicly. Restrict the Principal and add/keep critical conditions (like ExternalId) to prevent unauthorized role assumption.",
        proposed_change={
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "RestrictPublicPrincipal",
                    "Effect": "Allow",
                    "Principal": {"AWS": ["REPLACE_WITH_TRUSTED_PRINCIPALS"]},
                    "Action": "sts:AssumeRole",
                    "Condition": {
                        "StringEquals": {"sts:ExternalId": "REPLACE_WITH_EXTERNAL_ID"}
                    },
                }
            ],
        },
        blocked=False,
        violations=[],
    )


def _remediate_external_account_access(input_: NormalizedAi2Input, risk_level: str) -> Dict[str, Any]:
    return make_response(
        fix_type="trust_policy",
        risk_level=risk_level,
        explanation=f"{input_.resource_type} '{input_.resource_name}' grants external account access. Restrict the trusted principal to specific account/role ARNs and ensure conditions are present (e.g., ExternalId) for safer cross-account access.",
        proposed_change={
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "RestrictExternalAccountPrincipal",
                    "Effect": "Allow",
                    "Principal": {"AWS": ["REPLACE_WITH_TRUSTED_ACCOUNT_ROLE_ARNS"]},
                    "Action": "sts:AssumeRole",
                    "Condition": {
                        "StringEquals": {"sts:ExternalId": "REPLACE_WITH_EXTERNAL_ID"}
                    },
                }
            ],
        },
        blocked=False,
        violations=[],
    )


def _remediate_iam_privilege_escalation(input_: NormalizedAi2Input, risk_level: str) -> Dict[str, Any]:
    return make_response(
        fix_type="iam_policy",
        risk_level=risk_level,
        explanation=f"{input_.resource_type} '{input_.resource_name}' has permissions consistent with IAM privilege escalation. Restrict the IAM actions and the resources they apply to so the identity cannot create/modify broader privileges than needed.",
        proposed_change={
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "LeastPrivilegeRestrictIamEscalation",
                    "Effect": "Allow",
                    "Action": ["REPLACE_WITH_REQUIRED_IAM_ACTIONS"],
                    "Resource": ["REPLACE_WITH_ALLOWED_IAM_RESOURCE_ARNS"],
                }
            ],
        },
        blocked=False,
        violations=[],
    )


def _remediate_missing_mfa(input_: NormalizedAi2Input, risk_level: str) -> Dict[str, Any]:
    return make_response(
        fix_type="mfa",
        risk_level=risk_level,
        explanation=f"{input_.resource_type} '{input_.resource_name}' is missing MFA enforcement. Enable MFA and add least-privilege access controls that prevent interactive access when MFA is not present.",
        proposed_change=[
            "Enroll at least one MFA device for the affected identity (user/root) and validate it works for console/API access.",
            "Enable MFA enforcement in IAM (e.g., require MFA for console sign-in / sensitive operations).",
            "Apply a least-privilege deny control conditioned on MFA presence for only the sensitive actions/resources you must protect.",
            "Use placeholders: replace `REPLACE_WITH_SENSITIVE_ACTIONS` and `REPLACE_WITH_SENSITIVE_RESOURCE_ARNS` with the specific scope for this identity.",
        ],
        blocked=False,
        violations=[],
    )


def _remediate_old_access_key(input_: NormalizedAi2Input, risk_level: str) -> Dict[str, Any]:
    return make_response(
        fix_type="access_keys",
        risk_level=risk_level,
        explanation=f"Access key for '{input_.resource_name}' is older than recommended. Rotate credentials to reduce exposure from long-lived keys.",
        proposed_change=[
            "Create a new access key for the identity.",
            "Update dependent services/apps to use the new key (and confirm IAM permissions still match the needed least-privilege scope).",
            "Disable the old access key once new key usage is verified.",
            "Delete the old access key after a safe overlap window.",
        ],
        blocked=False,
        violations=[],
    )


def _remediate_unused_access_key(input_: NormalizedAi2Input, risk_level: str) -> Dict[str, Any]:
    return make_response(
        fix_type="access_keys",
        risk_level=risk_level,
        explanation=f"Access key for '{input_.resource_name}' appears unused. Remove unused credentials to reduce the risk of compromise.",
        proposed_change=[
            "Confirm the access key is truly unused (check last-used telemetry and team/system ownership).",
            "Disable the access key first.",
            "After confirmation that no workloads rely on it, delete the access key.",
        ],
        blocked=False,
        violations=[],
    )

