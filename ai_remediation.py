#These are the rules. The rules were suggested directly by google research rather than an AI. Therefore pure research.

#rules format 

# "finding_type": {
#     "title": short human-friendly name for display (UI/Frontend),
#
#     "summary": one sentence explaining:
#         - what the issue is
#         - why it matters (risk)
#
#     "recommended_actions": list of 2–3 steps to fix or investigate the issue.
#         These should be:
#         - actionable (what to do)
#         - concise (not long paragraphs)
#
#     "confidence": how certain we are about the recommendation
#         - "high" = strong known security issue
#         - "medium" = suspicious but not always malicious
#         - "low" = generic fallback
# }
REMEDIATION_RULES = {

  
    "CredentialAccess:IAMUser/AnomalousBehavior": {
        "title": "Suspicious Credential Access Activity",
        "summary": "Unusual IAM user activity related to credential access was detected and may indicate attempted credential theft or misuse.",
        "recommended_actions": [
            "Review recent user activity and sign-in history.",
            "Rotate the affected user's credentials.",
            "Restrict permissions and enable MFA if not already enabled."
        ],
        "confidence": "high"
    },
  
     "ROOT_MFA_DISABLED": {
        "title": "Root MFA Disabled",
        "summary": "Root account does not have MFA enabled, making it vulnerable to unauthorized access.",
        "recommended_actions": [
            "Enable MFA for the root account immediately.",
            "Store backup MFA codes securely.",
            "Avoid using the root account for daily operations."
        ],
        "confidence": "high"
    },
  
    "CredentialAccess:IAMUser/CompromisedCredentials": {
        "title": "Compromised Credentials Suspected",
        "summary": "AWS detected signs that this IAM user's credentials may be compromised.",
        "recommended_actions": [
            "Disable or rotate the affected credentials immediately.",
            "Review CloudTrail activity for unauthorized actions.",
            "Force a password reset and enable MFA."
        ],
        "confidence": "high"
    },

    "DefenseEvasion:IAMUser/AnomalousBehavior": {
        "title": "Suspicious Defense Evasion Activity",
        "summary": "Unusual IAM user activity was detected that may indicate an attempt to avoid detection or bypass security controls.",
        "recommended_actions": [
            "Review recent actions taken by the IAM user.",
            "Check for changes to logging, monitoring, or security settings.",
            "Restrict or suspend access if the behavior is unauthorized."
        ],
        "confidence": "high"
    },

    "DefenseEvasion:IAMUser/BedrockLoggingDisabled": {
        "title": "Bedrock Logging Disabled",
        "summary": "Logging related to Bedrock activity appears to have been disabled, reducing visibility into actions performed in the environment.",
        "recommended_actions": [
            "Re-enable Bedrock logging immediately.",
            "Review who disabled logging and when it occurred.",
            "Investigate recent Bedrock activity for suspicious behavior."
        ],
        "confidence": "high"
    },

    "Discovery:IAMUser/AnomalousBehavior": {
        "title": "Suspicious Discovery Activity",
        "summary": "Unusual IAM user activity related to discovery was detected and may indicate reconnaissance inside the AWS environment.",
        "recommended_actions": [
            "Review the resources the user attempted to enumerate.",
            "Check whether the behavior matches expected job duties.",
            "Reduce permissions if the access scope is broader than necessary."
        ],
        "confidence": "high"
    },

    "Exfiltration:IAMUser/AnomalousBehavior": {
        "title": "Suspicious Exfiltration Activity",
        "summary": "Unusual IAM user activity suggests possible data exfiltration or attempts to move sensitive data out of the environment.",
        "recommended_actions": [
            "Review recent data access and transfer activity.",
            "Restrict the user's permissions and rotate credentials.",
            "Investigate affected resources for unauthorized access."
        ],
        "confidence": "high"
    },

    "Impact:IAMUser/AnomalousBehavior": {
        "title": "Suspicious Impact Activity",
        "summary": "Unusual IAM user behavior was detected that may indicate destructive or disruptive activity in the AWS environment.",
        "recommended_actions": [
            "Review recent changes made by the IAM user.",
            "Identify any deleted, modified, or disrupted resources.",
            "Temporarily suspend access if the activity is not expected."
        ],
        "confidence": "high"
    },

    "InitialAccess:IAMUser/AnomalousBehavior": {
        "title": "Suspicious Initial Access Activity",
        "summary": "Unusual IAM user behavior suggests possible unauthorized initial access to the AWS environment.",
        "recommended_actions": [
            "Review login activity and source locations.",
            "Rotate credentials and require MFA.",
            "Check for newly created sessions or access tokens."
        ],
        "confidence": "high"
    },

    "PenTest:IAMUser/KaliLinux": {
        "title": "Activity From Kali Linux",
        "summary": "IAM user activity was associated with Kali Linux, which may indicate penetration testing or suspicious security tool usage.",
        "recommended_actions": [
            "Verify whether authorized security testing was taking place.",
            "Review actions performed by the IAM user.",
            "Restrict access and rotate credentials if the activity was not approved."
        ],
        "confidence": "medium"
    },

    "PenTest:IAMUser/ParrotLinux": {
        "title": "Activity From Parrot Linux",
        "summary": "IAM user activity was associated with Parrot Linux, which may indicate penetration testing or suspicious security tool usage.",
        "recommended_actions": [
            "Confirm whether the activity was part of an approved test.",
            "Review the user's recent actions and source IPs.",
            "Rotate credentials if the behavior was unexpected."
        ],
        "confidence": "medium"
    },

    "PenTest:IAMUser/PentooLinux": {
        "title": "Activity From Pentoo Linux",
        "summary": "IAM user activity was associated with Pentoo Linux, which may indicate penetration testing or suspicious security tool usage.",
        "recommended_actions": [
            "Verify whether the activity was authorized.",
            "Inspect recent IAM activity linked to the user.",
            "Restrict access and rotate credentials if needed."
        ],
        "confidence": "medium"
    },

    "Persistence:IAMUser/AnomalousBehavior": {
        "title": "Suspicious Persistence Activity",
        "summary": "Unusual IAM user activity suggests possible attempts to maintain long-term unauthorized access.",
        "recommended_actions": [
            "Review whether new credentials, keys, or users were created.",
            "Disable suspicious access paths and rotate credentials.",
            "Audit the environment for unauthorized persistence mechanisms."
        ],
        "confidence": "high"
    },

    "Policy:IAMUser/RootCredentialUsage": {
        "title": "Root Credential Usage Detected",
        "summary": "Root account credentials were used, which is risky and should be avoided for normal administrative work.",
        "recommended_actions": [
            "Review recent root account activity in CloudTrail.",
            "Stop using the root account for daily operations.",
            "Enable MFA and secure the root account immediately."
        ],
        "confidence": "high"
    },

    "Policy:IAMUser/ShortTermRootCredentialUsage": {
        "title": "Short-Term Root Credential Usage Detected",
        "summary": "Short-term use of root credentials was detected and should be reviewed because root access carries the highest level of privilege.",
        "recommended_actions": [
            "Review the exact root actions that were performed.",
            "Confirm whether the activity was necessary and authorized.",
            "Move future work to least-privilege IAM users or roles."
        ],
        "confidence": "high"
    },

    "PrivilegeEscalation:IAMUser/AnomalousBehavior": {
        "title": "Suspicious Privilege Escalation Activity",
        "summary": "Unusual IAM user behavior suggests possible attempts to gain higher privileges than originally assigned.",
        "recommended_actions": [
            "Review recent policy, role, and permission changes.",
            "Revoke excessive access and rotate credentials.",
            "Audit the account for newly granted privileged access."
        ],
        "confidence": "high"
    },

    "Recon:IAMUser/MaliciousIPCaller": {
        "title": "Malicious IP Reconnaissance Activity",
        "summary": "IAM activity was detected from a source IP associated with suspicious or malicious behavior.",
        "recommended_actions": [
            "Review the source IP and recent IAM actions.",
            "Confirm whether the activity was expected.",
            "Rotate credentials and restrict access if unauthorized."
        ],
        "confidence": "high"
    },

    "Recon:IAMUser/MaliciousIPCaller.Custom": {
        "title": "Custom Malicious IP Activity",
        "summary": "IAM activity was detected from a custom-listed suspicious IP source and should be investigated.",
        "recommended_actions": [
            "Review activity from the flagged IP address.",
            "Validate whether the source should have had access.",
            "Rotate credentials and block the source if needed."
        ],
        "confidence": "high"
    },

    "Recon:IAMUser/TorIPCaller": {
        "title": "Access From Tor Network",
        "summary": "IAM activity was detected from a Tor exit node, which may indicate anonymized or suspicious access.",
        "recommended_actions": [
            "Review the affected user's activity and login history.",
            "Confirm whether this access was expected.",
            "Rotate credentials if the access was unauthorized."
        ],
        "confidence": "high"
    },

    "Stealth:IAMUser/CloudTrailLoggingDisabled": {
        "title": "CloudTrail Logging Disabled",
        "summary": "CloudTrail logging appears to have been disabled, reducing your ability to audit and investigate account activity.",
        "recommended_actions": [
            "Re-enable CloudTrail logging immediately.",
            "Review who disabled logging and what actions followed.",
            "Investigate for possible unauthorized activity."
        ],
        "confidence": "high"
    },

    "Stealth:IAMUser/PasswordPolicyChange": {
        "title": "Password Policy Changed",
        "summary": "A password policy change was detected and should be reviewed to ensure security standards were not weakened.",
        "recommended_actions": [
            "Review the password policy changes that were made.",
            "Restore stronger password requirements if needed.",
            "Verify the change was approved and documented."
        ],
        "confidence": "medium"
    },

    "UnauthorizedAccess:IAMUser/ConsoleLoginSuccess.B": {
        "title": "Suspicious Console Login",
        "summary": "A successful IAM console login was detected under suspicious circumstances and may indicate unauthorized access.",
        "recommended_actions": [
            "Review the login details, including time and source location.",
            "Confirm whether the login was legitimate.",
            "Rotate credentials and enable MFA if compromise is suspected."
        ],
        "confidence": "high"
    },

    "UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration.InsideAWS": {
        "title": "Instance Credentials Exfiltrated Inside AWS",
        "summary": "Instance credentials may have been exposed and used from another AWS environment.",
        "recommended_actions": [
            "Identify the affected instance role and recent API activity.",
            "Revoke or rotate the exposed credentials by updating the role or instance usage.",
            "Investigate the workload for compromise or credential leakage."
        ],
        "confidence": "high"
    },

    "UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration.OutsideAWS": {
        "title": "Instance Credentials Exfiltrated Outside AWS",
        "summary": "Instance credentials may have been exposed and used outside AWS, which is a strong sign of compromise.",
        "recommended_actions": [
            "Immediately investigate the affected role and recent activity.",
            "Contain the impacted workload and rotate affected access paths.",
            "Review the instance and application for credential exposure."
        ],
        "confidence": "high"
    },

    "UnauthorizedAccess:IAMUser/MaliciousIPCaller": {
        "title": "Unauthorized Access From Malicious IP",
        "summary": "IAM activity was detected from an IP associated with malicious behavior and may indicate unauthorized access.",
        "recommended_actions": [
            "Review recent access and source IP information.",
            "Confirm whether the activity belongs to the legitimate user.",
            "Rotate credentials and restrict access if compromise is suspected."
        ],
        "confidence": "high"
    }
}

   
def apply_guardrails(remediation):
    actions = remediation.get("recommended_actions", [])
    remediation["recommended_actions"] = actions[:3]

    summary = remediation.get("summary", "").strip()
    if len(summary) > 220:
        remediation["summary"] = summary[:220]

    remediation["safe"] = True
    return remediation
 """
    Modifies a remediation dictionary to ensure that:
    - Only the first three recommended actions are included.
    - The summary is truncated to a maximum of 220 characters.
    - A 'safe' flag is added to indicate the remediation is processed.

    Parameters:
    remediation (dict): A dictionary containing remediation details.

    Returns:
    dict: The updated remediation dictionary.
    """
def generate_remediation(finding):
    finding_type = finding.get("finding_type", "UNKNOWN")
    severity = finding.get("severity", "Medium")
    resource = finding.get("resource", "unknown")
    description = finding.get("description", "")

    rule = REMEDIATION_RULES.get(finding_type)

    if rule:
        result = {
            "finding_type": finding_type,
            "title": rule["title"],
            "severity": severity,
            "resource": resource,
            "description": description,
            "summary": rule["summary"],
            "recommended_actions": rule["recommended_actions"],
            "confidence": rule["confidence"]
        }
    else:
        result = {
            "finding_type": finding_type,
            "title": "IAM Security Finding",
            "severity": severity,
            "resource": resource,
            "description": description,
            "summary": "Review this IAM finding and investigate whether the activity or configuration is expected.",
            "recommended_actions": [
                "Inspect the affected IAM user, role, or policy.",
                "Review recent related activity and permissions.",
                "Restrict access if the behavior appears unauthorized."
            ],
            "confidence": "low"
        }

    return apply_guardrails(result)

