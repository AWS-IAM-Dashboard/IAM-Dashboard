 (Issue AI-1)
 
 Use Case 1: Normal - Automated Policy Violation Detection
 
 - User Goal: Identify immediate security risks in a new or existing IAM policy.
 
 - Trigger: User uploads an IAM JSON policy or selects a resource from the dashboard.
 
 - AI Path (Rule-Based): The AI looks at the violations from scans and identifies "Hard Violations" (predefined violations) 
 
 - Outcome: The UI highlights the specific line in red and provides a "High" security risk score instantly.
 
 Use Case 2: Educational - Interactive Analysis
 
 - User Goal: Understand the reasoning behind a complex security flag.
 
 - Trigger: User clicks the Insights Icon next to a flagged "Nuanced Error" (e.g., a complex Trust Relationship).
 
 - AI Path (LLM-Based): The LLM analyzes the policy context and generates a plain-language explanation of the potential "Privilege Escalation" path.
 
 - Outcome: The user receives a concise description that teaches them the security principle, not just the fix.
 
 Use Case 3: Guided -  Remediation & Comparison
 
 - User Goal: Fix a security vulnerability without breaking the underlying application logic.
 
 - Trigger: User selects "Propose Fix" on a flagged item.
 
 - AI Path (Hybrid): The system picks a safe security template and lets the AI customize it with the user's specific information. (no automatic push to AWS; user must approve)
 
 - Outcome: The Split-View UI opens, showing the original policy on the left and the improved, least-privilege policy on the right for user approval.

 Use Case 4: Q&A - Natural Language Security 
 
 - User Goal: Get quick answers to specific AWS security questions without leaving the dashboard.
 
 - Trigger: User types a question into the Chatbot Widget (e.g., "How do I make this role read-only for S3?").
 
 - AI Path (LLM-Based): : The AI explains the steps in plain language and provides the matching security code as an example.
 
 - Outcome: The user can copy-paste the snippet or ask follow-up questions to refine the policy. (“If the question is too broad or unsafe, the chatbot explains limitations instead of hallucinating a bad policy.”)
