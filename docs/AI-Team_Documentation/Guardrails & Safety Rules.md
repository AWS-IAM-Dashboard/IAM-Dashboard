## AI-3 — Guardrails & Safety Rules (Remediation Engine)

Every AI suggestion goes through safety checks before you see it. **The AI recommends — you decide.** It never acts on its own.

---

## What the AI Is and Isn't Here to Do

The remediation engine only works with data from the IAM Dashboard. It is **grounded** in the data you provide, not general internet or training set knowledge.

- **Input source**: The engine follows the **AI Input Schema** (finding details, severity, `policy_snippet`, environment context).

It will **help you with**:

- **IAM policies and trust relationships**
- **Least privilege fixes**, **MFA enforcement**, **access key rotation**, **logging and monitoring**
- **Security remediations tied to real findings** in the dashboard

It **will not** handle:

- **Billing, account creation, or legal questions**
- **Generic AWS “how‑to” requests** that are not connected to security findings
- **Password recovery** or **non-security resource management**

Out-of-scope requests receive a **safe, predefined response** explaining what the assistant is for. No weird errors, no hallucinated answers.

To reduce prompt injection risk, **input size is capped** so users cannot overwhelm the model with arbitrarily large or unrelated content.

---

## Hard Rules — The AI Will Never Recommend These

These rules are **non‑negotiable**. If a suggestion hits any of these, it is blocked — either by the **system prompt** or by **post‑processing validators**. Both layers check.

### IAM / Policy Level

- `Action: "*"` or anything as broad as `iam:*` when a narrower set is possible
- `Resource: "*"` when a specific ARN (or tightly scoped pattern) should be used
- Recommending `AdministratorAccess` or any full‑access policy as a “fix”
- Trusting `Principal: "*"` or overly broad cross‑account trust without conditions
- Removing `ExternalId` or other critical trust conditions just to “make something work”

### Security Controls

- Disabling **MFA**, **CloudTrail**, **Config**, or **GuardDuty** as a workaround
- Opening `0.0.0.0/0` for sensitive services without strong, documented justification
- Stripping **PII controls** or **audit requirements** to reduce friction
- Returning **hardcoded credentials**, API keys, or secrets in any response
- Suggesting to “just skip the change review” to ship something faster

---

## What a Valid Response Looks Like

Every remediation response is a **single JSON object** with a **fixed structure**. There are no exceptions — this is what makes validation deterministic.

### Response Fields

| Field            | What it does                                                                                 |
|------------------|----------------------------------------------------------------------------------------------|
| `type`           | The fix category — e.g. `iam_policy`, `trust_policy`, `mfa`, `access_keys`, `iam_user_hardening` |
| `risk_level`     | `"low"`, `"medium"`, or `"high"`                                                             |
| `explanation`    | Plain‑English explanation of **why this remediation matters**                                |
| `proposed_change`| The actual fix — **policy JSON** or a **list of operational steps**, depending on `type`    |
| `requires_review`| Always `true`. The AI never auto‑applies anything                                            |
| `blocked`        | `true` if a guardrail fired and the suggestion was intentionally blocked                     |
| `violations`     | Which rules triggered, e.g. `["BANNED_WILDCARD_ACTION"]`                                     |

### Type‑Specific Behavior

- **Policy types** (`iam_policy`, `trust_policy`) return **full policy JSON**, which is then validated for:
  - Wildcards (`Action: "*"`, `Resource: "*"`)
  - Dangerous principals (e.g. `Principal: "*"`)
  - Missing or weakened conditions in trust policies

- **Operational types** (`mfa`, `access_keys`, `iam_user_hardening`, etc.) return a **list of concrete steps**, which are validated to ensure they **do not weaken security posture** (for example, never recommending disabling MFA or logging).

### Placeholders

Vague placeholders like `"..."` or `"some-arn-here"` are **not allowed**.

Any placeholder must be:

- **Explicitly labeled**, e.g. `REPLACE_WITH_ACCOUNT_ID`
- Clear enough that the user knows exactly what to fill in and where

---

## How Every Request Gets Checked

There is a **five‑stage pipeline**. Each stage is independently testable and logged.

### Stage 1 — Input Check

Before anything reaches the model, the input is scanned for:

- Prompt injection attempts
- Out‑of‑scope topics (violations of the topic policy)
- Banned or suspicious patterns

If the input fails:

- The request is **blocked**
- A **safe, predefined explanation** is returned to the user
- The attempt is **logged** for potential review

### Stage 2 — Prompt Constraints

The **system prompt** clearly defines:

- Who the model is (Cloud Security Remediation Engine for IAM Dashboard)
- What it **can** do
- What it **must never** suggest (banned rules)
- The **required JSON output format**

The model is explicitly instructed to **only use the provided context** — it must not reach outside the input or invent unrelated details.

### Stage 3 — Schema Validation

The raw model output is:

- Parsed as JSON
- Checked against the **output schema**:
  - All **required fields** must exist
  - Enum values (e.g. `type`, `risk_level`) must be valid
  - The `proposed_change` shape must match the declared `type`

If schema validation fails:

- The response is treated as **blocked**
- The user receives a **safe fallback message** instead of an unsafe or malformed suggestion

### Stage 4 — Safety Filter

The parsed `proposed_change` is scanned for **banned recommendations**:

- Wildcards and over‑broad access
- Dangerous principals and trust policies
- Steps that weaken or disable security controls

If any banned recommendation is detected:

- `blocked` is set to `true`
- `violations` is populated with the relevant rule IDs
- The unsafe suggestion **never surfaces** to the user as an approved remediation

### Stage 5 — Human Review Gate

The final, validated result is sent to the UI:

- `requires_review` is **always** `true`
- The user must **explicitly approve** or copy‑paste any change
- Higher‑risk findings (e.g. `risk_level = "high"`) get more prominent warnings and UX friction, but **nothing ever auto‑applies**

All calls are logged with:

- Timestamp
- Model/provider identifier
- Finding ID
- Whether validation passed
- Which rules (if any) fired
- Whether the result was blocked

---

## How to Update the Rules

### Adding or Changing a Banned Rule

1. **Update the Banned Rules Registry** (canonical list of rules).
2. **Update the system prompt** so the model is explicitly told about the new/changed rule.
3. **Update the post‑processing validator** to enforce the rule in code.
4. **Add or update tests** to prove the new rule is applied correctly.

### Adding a New Remediation Type

1. **Add the new type** to the `type` enum in the output schema.
2. **Define the `proposed_change` shape** for that type (policy JSON vs. operational steps, etc.).
3. **Implement type‑specific validators and banned patterns** for that new type.
4. *(Optional)* **Add a prompt example** to guide the model toward good behavior for that type.

### Adjusting Risk Levels

- Clearly define what makes a remediation **low**, **medium**, or **high** risk:
  - Base this on **finding severity** and how **invasive** the proposed fix is.
- Update any logic that derives or normalizes `risk_level`.
- Update UI behavior per tier (warnings, highlighting), while keeping `requires_review` **always `true`**.

### Onboarding a New Model

1. **Reuse the existing system prompt** (with any necessary minor adjustments).
2. Keep **all safety logic in code** — never rely on the model alone to enforce guardrails.
3. Run the **full test suite** (including schema validation and guardrail tests) against the new model before allowing it into any user‑facing environment.

