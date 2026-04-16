# LLM Triage, Overview & Runbook — Setup Guide

**Goal:** Get the three Claude-powered features working via the existing API Gateway and Lambda, with the Bedrock API key stored securely in AWS Parameter Store.

---

## The Three Features

| Feature | Endpoint | What it does |
|---|---|---|
| Triage | `POST /llm/triage` | True/false positive assessment, confidence score, MITRE techniques, immediate actions |
| Overview | `POST /llm/root-cause` | Attack chain reconstruction, root cause narrative, contributing factors |
| Runbook | `POST /llm/runbook` | 4-step IR playbook: IDENTIFY → CONTAIN → REMEDIATE → VERIFY |

---

## Step 1 — Store the Bedrock API Key in Parameter Store

1. AWS Console → Systems Manager → Parameter Store → Create parameter
2. Fill in:
   - Name: `/iam-dashboard/dev/bedrock-api-key`
   - Tier: Standard
   - Type: **SecureString**
   - KMS key: use the default `aws/ssm` key (or your team's CMK)
   - Value: your Bedrock API key from AWS Console → Bedrock → API keys
3. Create parameter

---

## Step 2 — Allow the Lambda to Read the Parameter

Add this statement to the `ArgusVoiceLambdaRole` inline policy:

```json
{
  "Sid": "ReadBedrockKeyFromSSM",
  "Effect": "Allow",
  "Action": [
    "ssm:GetParameter"
  ],
  "Resource": "arn:aws:ssm:us-east-1:YOUR_ACCOUNT_ID:parameter/iam-dashboard/dev/bedrock-api-key"
},
{
  "Sid": "DecryptSSMKey",
  "Effect": "Allow",
  "Action": [
    "kms:Decrypt"
  ],
  "Resource": "arn:aws:kms:us-east-1:YOUR_ACCOUNT_ID:key/YOUR_KMS_KEY_ID"
}
```

> If you used the default `aws/ssm` key, the `kms:Decrypt` statement is still required — use the ARN of the `aws/ssm` managed key in your account.

---

## Step 3 — Update the Lambda to Fetch the Key from Parameter Store

Replace the hardcoded `BEDROCK_API_KEY` env var lookup in each Lambda handler with a Parameter Store fetch. Add this helper at the top of each Lambda:

```python
import boto3
import os

_ssm = boto3.client("ssm", region_name=os.environ.get("AWS_DEFAULT_REGION", "us-east-1"))
_bedrock_key_cache = None

def _get_bedrock_api_key() -> str | None:
    global _bedrock_key_cache
    if _bedrock_key_cache:
        return _bedrock_key_cache
    try:
        resp = _ssm.get_parameter(
            Name="/iam-dashboard/dev/bedrock-api-key",
            WithDecryption=True
        )
        _bedrock_key_cache = resp["Parameter"]["Value"]
        return _bedrock_key_cache
    except Exception:
        return None
```

Then update the Bedrock client setup in the handler to use it:

```python
def _get_bedrock_client():
    api_key = _get_bedrock_api_key()
    region = os.environ.get("AWS_DEFAULT_REGION", "us-east-1")
    if api_key:
        os.environ["AWS_BEARER_TOKEN_BEDROCK"] = api_key
    return boto3.client("bedrock-runtime", region_name=region)
```

The key is fetched once per Lambda warm instance and cached — no SSM call on every invocation.

---

## Step 4 — Remove BEDROCK_API_KEY from Lambda Environment Variables

In each Lambda's configuration:

1. Lambda console → Function → Configuration → Environment variables
2. Delete `BEDROCK_API_KEY` if it exists
3. Keep only:
   - `AWS_DEFAULT_REGION` = `us-east-1`
   - `BEDROCK_MODEL_ID` = `anthropic.claude-haiku-4-5-20251001`
   - `CORS_ALLOW_ORIGIN` = your frontend domain

The key now lives exclusively in Parameter Store — not in env vars, not in code.

---

## Step 5 — Register the API Gateway Route

In the existing API Gateway (`erh3a09d7l`):

1. Resources → Create resource → `/llm`
2. Under `/llm` → Create resource → `/triage`
3. Under `/triage` → Create method → `POST`
   - Integration type: Lambda Function
   - Lambda proxy integration: ✅ enabled
   - Lambda function: `argus-llm-triage`
4. Repeat for `/llm/root-cause` → Lambda: `argus-llm-root-cause`
5. Repeat for `/llm/runbook` → Lambda: `argus-llm-runbook`
6. Enable CORS on each resource (Actions → Enable CORS)
7. Actions → Deploy API → redeploy existing stage

---

## Step 6 — Verify It's Working

```bash
curl -X POST https://erh3a09d7l.execute-api.us-east-1.amazonaws.com/v1/llm/triage \
  -H "Content-Type: application/json" \
  -d '{
    "finding_id": "test-001",
    "severity": "CRITICAL",
    "finding_type": "UnauthorizedAccess:IAMUser",
    "resource_name": "arn:aws:iam::123456789012:user/test",
    "description": "Suspicious API calls from Tor exit node."
  }'
```

**Live:** `"model": "anthropic.claude-haiku-4-5-20251001"` in the response
**Mock fallback:** `"model": "mock"` — check CloudWatch Logs for the Lambda for the error

---

## Checklist

- [ ] Parameter `/iam-dashboard/dev/bedrock-api-key` created as SecureString in SSM
- [ ] `ArgusVoiceLambdaRole` updated with `ssm:GetParameter` + `kms:Decrypt` permissions
- [ ] Each Lambda updated to fetch key from SSM via `_get_bedrock_api_key()`
- [ ] `BEDROCK_API_KEY` removed from Lambda environment variables
- [ ] `/llm/triage`, `/llm/root-cause`, `/llm/runbook` resources added to existing Gateway
- [ ] CORS enabled on all 3 new resources
- [ ] Stage redeployed
- [ ] Smoke test returns `model` ≠ `"mock"` on all 3 endpoints
