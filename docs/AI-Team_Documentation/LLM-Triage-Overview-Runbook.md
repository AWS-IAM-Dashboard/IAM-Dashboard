# LLM Triage, Overview & Runbook — Setup Guide

**Goal:** Get the three Claude-powered features working via the existing Lambda and API Gateway, with the Bedrock API key stored securely in AWS Parameter Store.
**Approach:** All infrastructure via Terraform — CI deploys on merge to `main`. No console changes.

---

## The Three Features

| Feature | Endpoint | What it does |
|---|---|---|
| Triage | `POST /llm/triage` | True/false positive assessment, confidence score, MITRE techniques, immediate actions |
| Overview | `POST /llm/root-cause` | Attack chain reconstruction, root cause narrative, contributing factors |
| Runbook | `POST /llm/runbook` | 4-step IR playbook: IDENTIFY → CONTAIN → REMEDIATE → VERIFY |

All three route through the **existing scanner Lambda** (`iam-dashboard-scanner`) — no new Lambda functions needed. The Lambda detects `/llm/*` paths and handles them before the scan routing runs.

---

## What's Already Done (IaC committed)

### `infra/lambda/lambda_function.py`
- [x] `_get_bedrock_api_key()` — fetches `/iam-dashboard/dev/bedrock-api-key` from SSM, cached per warm instance
- [x] `_get_bedrock_model_id()` — fetches `/iam-dashboard/dev/bedrock-model-id` from SSM, falls back to Haiku default
- [x] `_get_bedrock_client()` — sets `AWS_BEARER_TOKEN_BEDROCK` from SSM key, returns bedrock-runtime client
- [x] `_handle_llm_triage()`, `_handle_llm_root_cause()`, `_handle_llm_runbook()` — full handlers with mock fallback
- [x] `lambda_handler` — routes `llm-triage`, `llm-root-cause`, `llm-runbook` paths before scan routing

### `infra/lambda/lambda-role-policy.json`
- [x] `SSMBedrockKey` — `ssm:GetParameter` scoped to both `/iam-dashboard/dev/bedrock-api-key` and `/iam-dashboard/dev/bedrock-model-id`
- [x] `BedrockInvokeModel` — `bedrock:InvokeModel` scoped to `anthropic.claude-haiku-4-5-20251001`
- [x] `kms:Decrypt` already present — covers SSM SecureString decryption

### `infra/lambda/main.tf`
- [x] `aws_ssm_parameter.bedrock_api_key` — `/iam-dashboard/dev/bedrock-api-key` (SecureString, `lifecycle ignore_changes` on value)
- [x] `aws_ssm_parameter.bedrock_model_id` — `/iam-dashboard/dev/bedrock-model-id` (String, Terraform-managed)

### `infra/lambda/variables.tf`
- [x] `bedrock_model_id` variable (default: `anthropic.claude-haiku-4-5-20251001`)
- [x] `bedrock_api_key_placeholder` variable (sensitive, default: `REPLACE_ME`)

### `infra/main.tf`
- [x] `bedrock_model_id` and `bedrock_api_key_placeholder` passed through to `module "lambda"`

### `infra/variables.tf`
- [x] Both Bedrock variables declared at root level — picked up by `TF_VAR_*` in CI

### `infra/api-gateway/main.tf`
- [x] `POST /llm/triage`, `POST /llm/root-cause`, `POST /llm/runbook` routes → existing scanner Lambda integration
- [x] Per-route throttle settings (`burst: 10`, `rate: 5`)

### `infra/api-gateway/variables.tf`
- [x] `throttling_llm_burst_limit` (default: 10) and `throttling_llm_rate_limit` (default: 5)

### `.github/workflows/terraform-apply.yml`
- [x] `TF_VAR_bedrock_api_key_placeholder: ${{ secrets.BEDROCK_API_KEY }}` added to both `plan` and `apply` jobs

---

## What Still Needs to Be Done

### 1 — Add `BEDROCK_API_KEY` as a GitHub Actions secret

This is the only step requiring human input:

1. GitHub → repository → Settings → Secrets and variables → Actions
2. New repository secret → Name: `BEDROCK_API_KEY` → Value: your key from AWS Bedrock console

### 2 — Merge to `main`

The CI workflow `terraform-apply.yml` runs automatically on merge to `main`. It:
- Passes `TF_VAR_bedrock_api_key_placeholder` from the `BEDROCK_API_KEY` secret
- Runs `terraform apply` from `infra/` — covers `module "lambda"` and `module "api_gateway"` in one apply
- Creates both SSM parameters, updates the Lambda code, deploys the 3 new API Gateway routes

Terraform will not overwrite the SSM key value on subsequent applies (`lifecycle ignore_changes`).

---

## Smoke Test (after CI apply)

```bash
# Triage
curl -X POST https://erh3a09d7l.execute-api.us-east-1.amazonaws.com/v1/llm/triage \
  -H "Content-Type: application/json" \
  -d '{"finding_id":"test-001","severity":"CRITICAL","finding_type":"UnauthorizedAccess:IAMUser","resource_name":"arn:aws:iam::123456789012:user/test","description":"Suspicious API calls from Tor exit node."}'

# Root cause
curl -X POST https://erh3a09d7l.execute-api.us-east-1.amazonaws.com/v1/llm/root-cause \
  -H "Content-Type: application/json" \
  -d '{"finding_id":"test-001","severity":"CRITICAL","finding_type":"UnauthorizedAccess:IAMUser","resource_name":"arn:aws:iam::123456789012:user/test","description":"Suspicious API calls."}'

# Runbook
curl -X POST https://erh3a09d7l.execute-api.us-east-1.amazonaws.com/v1/llm/runbook \
  -H "Content-Type: application/json" \
  -d '{"finding_id":"test-001","severity":"CRITICAL","finding_type":"UnauthorizedAccess:IAMUser","resource_name":"arn:aws:iam::123456789012:user/test","resource_arn":"arn:aws:iam::123456789012:user/test","description":"Suspicious API calls."}'
```

**Pass:** `"model": "anthropic.claude-haiku-4-5-20251001"` in each response
**Fail:** `"model": "mock"` — check CloudWatch Logs → `/aws/lambda/iam-dashboard-scanner`

---

## Checklist

- [x] `lambda_function.py` — SSM fetch, Bedrock client, LLM handlers, routing
- [x] `lambda-role-policy.json` — SSM + Bedrock permissions for both parameters
- [x] `infra/lambda/main.tf` — both SSM parameter resources added
- [x] `infra/lambda/variables.tf` — Bedrock variables declared
- [x] `infra/main.tf` — Bedrock vars passed to `module "lambda"`
- [x] `infra/variables.tf` — Bedrock vars declared at root
- [x] `infra/api-gateway/main.tf` — 3 LLM routes + throttle settings
- [x] `.github/workflows/terraform-apply.yml` — `TF_VAR_bedrock_api_key_placeholder` injected from CI secret
- [ ] `BEDROCK_API_KEY` GitHub Actions secret added
- [ ] Merge to `main` — CI applies everything automatically
- [ ] Smoke test: all 3 endpoints return `model` ≠ `"mock"`
- [ ] CloudWatch Logs confirm no SSM or Bedrock errors
