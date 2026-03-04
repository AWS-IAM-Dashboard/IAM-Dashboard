 AI Input Schema Specification (Issue AI-2)

 This JSON schema represents the content the Backend API (AI-7) will send to the AI model (AI-5) when a user requests remediation guidance for a specific IAM finding.

 {
   "finding_details": {
     "finding_id": "string",
     "finding_type": "string", 
     "severity": ["Critical", "High", "Medium", "Low"],
     "scanner_source": "string",
     "resource": {
       "resource_type": "string",
       "resource_name": "string",
       "policy_snippet": "object" 
     }
   },
   "environment_context": {
     "account_id": "string",
     "iam_relationships": {
       "user_role": "string",
       "attached_groups": ["string"],
       "attached_policies": ["string"]
     },
     "related_findings": ["string"]
   }
 }

 1. Finding Fields (The Core Issue)
 These fields define the exact vulnerability the AI needs to fix:

 - finding_type: The specific IAM rule violation (e.g., MFA_NOT_ENABLED, CROSS_ACCOUNT_ROLE_TOO_PERMISSIVE, ACCESS_KEY_TOO_OLD). The AI will use this to map to its logic for the Top 10 IAM finding types.
 
 - severity: The severity score (e.g., Critical, High, Medium, Low) assigned by the Security team. This helps the AI adjust the urgency in its "Why this matters" explanation.
 
 - scanner_source: Identifies which tool caught the issue (e.g., OPA, Checkov, AWS Security Hub, IAM Analysis).
 
 - resource_type & resource_name: The specific AWS asset (e.g., AWS::IAM::Role, arn:aws:iam::123456789012:role/DevRole).
 
 - policy_snippet: The actual JSON of the overly permissive IAM policy or trust relationship. (Crucial: The AI needs this snippet so it can rewrite the exact JSON code for the user to copy-paste).

 2. Context Fields (The "Blast Radius")
 These fields give the AI situational awareness so it doesn't give blind advice:

 - account_id: The AWS account ID where the resource lives. (Important because the dashboard supports a "Multi-account lite" feature).
 
 - iam_relationships: Details on how this identity fits into the environment. The Security team is specifically responsible for mapping "IAM relationships (user / group / role)". If the AI knows a user is part of an AdminGroup, it might suggest fixing the group policy rather than the user policy.
 
 - related_findings: A list of other finding_ids on this same resource. If a user lacks MFA and has inactive access keys, the AI can provide a more comprehensive "Why this matters" explanation.
