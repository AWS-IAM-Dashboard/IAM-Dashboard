# API Gateway + Lambda Integration Plan
## Argus Voice — LLM & TTS Routes

**Status:** In Progress
**Phase:** 4 (Dev → Staging)
**Owner:** Backend + DevOps/Security
**Approach:** All infrastructure via Terraform — CI deploys on merge to `main`. No console changes.

---

## Overview

The three AWS-backed LLM routes (`/llm/triage`, `/llm/root-cause`, `/llm/runbook`) have been added to the **existing scanner Lambda** (`iam-dashboard-scanner`) and wired into the **existing API Gateway** (`erh3a09d7l`). No new Lambda functions or new API Gateway needed.

Bedrock credentials are stored in AWS SSM Parameter Store — no `BEDROCK_API_KEY` in `.env` or Lambda environment variables.

---

## What's Handled Where

| Route | Handler | Status |
|---|---|---|
| `POST /llm/triage` | `iam-dashboard-scanner` Lambda via `_handle_llm_triage()` | IaC done — pending CI apply |
| `POST /llm/root-cause` | `iam-dashboard-scanner` Lambda via `_handle_llm_root_cause()` | IaC done — pending CI apply |
| `POST /llm/runbook` | `iam-dashboard-scanner` Lambda via `_handle_llm_runbook()` | IaC done — pending CI apply |
| `POST /tts/synthesize` | Flask container → AWS Polly | Planned (Phase 4 follow-on) |
| `POST /voice/intent` | Flask container → Bedrock | Planned (Phase 4 follow-on) |
| All other routes | Flask container | Unchanged |

---

## Architecture

```
Browser (React frontend)
    │
    │  VITE_IR_API_BASE = https://erh3a09d7l.execute-api.us-east-1.amazonaws.com/v1
    │
    ▼
Amazon API Gateway — erh3a09d7l  (existing)
    │
    ├── POST /llm/triage     ──► iam-dashboard-scanner Lambda  [NEW — IaC done]
    ├── POST /llm/root-cause ──► iam-dashboard-scanner Lambda  [NEW — IaC done]
    ├── POST /llm/runbook    ──► iam-dashboard-scanner Lambda  [NEW — IaC done]
    ├── /auth/*              ──► existing auth Lambda (unchanged)
    └── /scan/*              ──► existing scanner Lambda (unchanged)

Flask container (still running for all other routes)
    ├── /api/v1/aws/iam, /aws/ec2, /aws/s3 ...
    ├── /api/v1/ir/actions/*, /ir/forensics/*, /ir/evidence/*
    ├── /api/v1/tts/synthesize    ← stays on Flask until Phase 4 follow-on
    ├── /api/v1/voice/intent      ← stays on Flask until Phase 4 follow-on
    └── ... (all other routes unchanged)
```

---

## SSM Parameters

Both Bedrock values are stored in SSM — not in Lambda env vars or `.env` files.

| Parameter path | Type | How set | How read |
|---|---|---|---|
| `/iam-dashboard/dev/bedrock-api-key` | SecureString | GitHub secret `BEDROCK_API_KEY` via CI | `_get_bedrock_api_key()` in Lambda |
| `/iam-dashboard/dev/bedrock-model-id` | String | `bedrock_model_id` Terraform variable | `_get_bedrock_model_id()` in Lambda |

Terraform creates both paths on first `apply`. The API key value is never overwritten after initial creation (`lifecycle ignore_changes`). The model ID is Terraform-managed and can be changed by updating the variable.

---

## IAM — Lambda Role Policy

The existing `iam-dashboard-lambda-role` policy (`infra/lambda/lambda-role-policy.json`) has been updated with:

```json
{
  "Sid": "SSMBedrockKey",
  "Effect": "Allow",
  "Action": ["ssm:GetParameter"],
  "Resource": [
    "arn:aws:ssm:us-east-1:*:parameter/iam-dashboard/dev/bedrock-api-key",
    "arn:aws:ssm:us-east-1:*:parameter/iam-dashboard/dev/bedrock-model-id"
  ]
},
{
  "Sid": "BedrockInvokeModel",
  "Effect": "Allow",
  "Action": ["bedrock:InvokeModel"],
  "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-haiku-4-5-20251001"
}
```

`kms:Decrypt` with `Resource: "*"` was already present — covers SSM SecureString decryption.

---

## CI Deployment Flow

```
1. Add BEDROCK_API_KEY to GitHub Actions secrets (one-time, human step)
        │
        ▼
2. Merge PR to main
        │
        ▼
3. terraform-apply.yml runs
   - TF_VAR_bedrock_api_key_placeholder = ${{ secrets.BEDROCK_API_KEY }}
   - terraform apply from infra/
        │
        ├── module "lambda"      → deploys updated Lambda code + IAM policy + SSM parameters
        └── module "api_gateway" → deploys 3 new LLM routes
        │
        ▼
4. SSM parameters created:
   /iam-dashboard/dev/bedrock-api-key  (SecureString — real key from GitHub secret)
   /iam-dashboard/dev/bedrock-model-id (String — anthropic.claude-haiku-4-5-20251001)
```

---

## API Gateway Throttle Settings

LLM routes are throttled tighter than scan routes since each call invokes Bedrock:

| Route | Burst limit | Rate limit |
|---|---|---|
| `POST /llm/triage` | 10 | 5 req/s |
| `POST /llm/root-cause` | 10 | 5 req/s |
| `POST /llm/runbook` | 10 | 5 req/s |

Controlled via `throttling_llm_burst_limit` and `throttling_llm_rate_limit` in `infra/api-gateway/variables.tf`.

---

## Smoke Tests

```bash
curl -X POST https://erh3a09d7l.execute-api.us-east-1.amazonaws.com/v1/llm/triage \
  -H "Content-Type: application/json" \
  -d '{"finding_id":"test-001","severity":"CRITICAL","finding_type":"UnauthorizedAccess:IAMUser","resource_name":"arn:aws:iam::123456789012:user/test","description":"Suspicious API calls from Tor exit node."}'

curl -X POST https://erh3a09d7l.execute-api.us-east-1.amazonaws.com/v1/llm/root-cause \
  -H "Content-Type: application/json" \
  -d '{"finding_id":"test-001","severity":"CRITICAL","finding_type":"UnauthorizedAccess:IAMUser","resource_name":"arn:aws:iam::123456789012:user/test","description":"Suspicious API calls."}'

curl -X POST https://erh3a09d7l.execute-api.us-east-1.amazonaws.com/v1/llm/runbook \
  -H "Content-Type: application/json" \
  -d '{"finding_id":"test-001","severity":"CRITICAL","finding_type":"UnauthorizedAccess:IAMUser","resource_name":"arn:aws:iam::123456789012:user/test","resource_arn":"arn:aws:iam::123456789012:user/test","description":"Suspicious API calls."}'
```

**Pass:** `"model": "anthropic.claude-haiku-4-5-20251001"` in each response
**Fail:** `"model": "mock"` — check CloudWatch Logs → `/aws/lambda/iam-dashboard-scanner`

---

## What Stays on Flask

Everything below continues to be served by Flask — no changes:

- `/api/v1/aws/*` (IAM, EC2, S3, Security Hub, Config)
- `/api/v1/ir/actions/*`, `/ir/forensics/*`, `/ir/evidence/*`, `/ir/audit`
- `/api/v1/dashboard`, `/api/v1/scan-history`, `/api/v1/metrics`
- `/api/v1/tts/synthesize` (Phase 4 follow-on)
- `/api/v1/voice/intent` (Phase 4 follow-on)

---

## Checklist

### Done (IaC committed)
- [x] `infra/lambda/lambda_function.py` — SSM fetch, Bedrock client, LLM handlers, routing
- [x] `infra/lambda/lambda-role-policy.json` — SSM + Bedrock permissions for both parameters
- [x] `infra/lambda/main.tf` — both SSM parameter resources (`bedrock-api-key`, `bedrock-model-id`)
- [x] `infra/lambda/variables.tf` — `bedrock_model_id` + `bedrock_api_key_placeholder`
- [x] `infra/main.tf` — both vars passed through to `module "lambda"`
- [x] `infra/variables.tf` — both vars declared at root level
- [x] `infra/api-gateway/main.tf` — 3 LLM routes + per-route throttle settings
- [x] `infra/api-gateway/variables.tf` — `throttling_llm_burst_limit` + `throttling_llm_rate_limit`
- [x] `.github/workflows/terraform-apply.yml` — `TF_VAR_bedrock_api_key_placeholder` injected from CI secret

### Pending
- [ ] Add `BEDROCK_API_KEY` to GitHub Actions secrets
- [ ] Merge to `main` — CI applies everything
- [ ] Smoke test all 3 endpoints — confirm `model` ≠ `"mock"`
- [ ] CloudWatch Logs check — no SSM or Bedrock errors in `/aws/lambda/iam-dashboard-scanner`
- [ ] Update `Voice-Incident-Response-Agent.md` Phase 4 checklist after validation
