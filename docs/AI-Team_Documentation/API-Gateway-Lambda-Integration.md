# API Gateway + Lambda Integration Plan
## Argus Voice — LLM & TTS Routes

**Status:** Planning
**Phase:** 4 (Dev → Staging)
**Owner:** Backend + DevOps/Security

---

## Overview

This document covers the plan to move the three AWS-backed Argus routes off the Flask container and onto dedicated Lambda functions fronted by Amazon API Gateway (REST API). This is **Option B** from the API Gateway evaluation.

The goal is to eliminate long-lived AWS credentials from developer `.env` files for these routes. Lambda execution roles handle Bedrock and Polly permissions at the AWS layer — no `BEDROCK_API_KEY` or `AWS_SECRET_ACCESS_KEY` needed in the app config once this is live.

---

## Scope — The 3 Lambda Functions

| Lambda | Current Flask route | AWS service called |
|---|---|---|
| `argus-tts-synthesize` | `POST /api/v1/tts/synthesize` | Amazon Polly Neural |
| `argus-voice-intent` | `POST /api/v1/voice/intent` | Amazon Bedrock (Claude) |
| `argus-llm-triage` | `POST /api/v1/llm/triage` | Amazon Bedrock (Claude) |

> `llm/root-cause` and `llm/runbook` share the same Bedrock pattern as triage. They can be added as follow-on Lambdas using the same execution role and template — out of scope for this initial rollout but documented at the end.

---

## Architecture

```
Browser (React frontend)
    │
    │  VITE_IR_API_BASE = https://erh3a09d7l.execute-api.us-east-1.amazonaws.com/v1
    │                     (existing API Gateway — already handles /auth and /scan)
    │
    ▼
Amazon API Gateway — erh3a09d7l  (existing, add new resources here)
    │
    ├── POST /tts/synthesize  ──────────────► Lambda: argus-tts-synthesize  [NEW]
    │                                              │
    │                                              └── Amazon Polly Neural → audio/mpeg
    │
    ├── POST /voice/intent  ────────────────► Lambda: argus-voice-intent    [NEW]
    │                                              │
    │                                              └── Amazon Bedrock (Claude) → JSON
    │
    ├── POST /llm/triage  ──────────────────► Lambda: argus-llm-triage      [NEW]
    │                                              │
    │                                              └── Amazon Bedrock (Claude) → JSON
    │
    ├── /auth/*  ───────────────────────────► existing integration (unchanged)
    └── /scan/*  ───────────────────────────► existing integration (unchanged)

Flask container (still running for all other routes)
    ├── /api/v1/aws/iam
    ├── /api/v1/aws/ec2
    ├── /api/v1/ir/actions/*
    └── ... (unchanged)
```

The Flask container is **not** removed. Only the three routes above move to Lambda. All other routes continue to be served by Flask directly.

> **No new API Gateway needed.** The existing gateway (`erh3a09d7l`) already serves `/auth` and `/scan`. The 3 new resources are added to that same API and deployed to its existing stage.

---

## IAM — Execution Role

Create one shared execution role: `ArgusVoiceLambdaRole`

### Trust policy (who can assume this role)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### Permission policy — attach inline or as a managed policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BedrockInvokeModel",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-haiku-4-5-20251001"
      ]
    },
    {
      "Sid": "PollyTTS",
      "Effect": "Allow",
      "Action": [
        "polly:SynthesizeSpeech"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:*:log-group:/aws/lambda/argus-*:*"
    }
  ]
}
```

**Notes:**
- Bedrock resource ARN is scoped to the exact model. If you switch to Sonnet for production, add its ARN to the list or update the resource.
- Polly does not support resource-level ARNs — `*` is required by AWS.
- CloudWatch Logs permission is required for Lambda to write execution logs.
- Do **not** attach `AmazonBedrockFullAccess` or `AmazonPollyFullAccess` — those are overly broad. Use the inline policy above.

---

## API Gateway — Resource Policy

Attach this to the API to restrict who can invoke it. Replace the placeholder values.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowFrontendInvoke",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "execute-api:Invoke",
      "Resource": "arn:aws:execute-api:us-east-1:YOUR_ACCOUNT_ID:YOUR_API_ID/*/POST/*",
      "Condition": {
        "StringEquals": {
          "aws:Referer": "https://YOUR_CLOUDFRONT_DOMAIN.cloudfront.net"
        }
      }
    }
  ]
}
```

If you are not behind CloudFront yet, use an API key + usage plan instead (see Auth section below).

---

## Auth — API Key + Usage Plan (recommended for staging)

1. API Gateway console → API Keys → Create key → name it `argus-staging-key`
2. Usage Plans → Create plan:
   - Throttle: 50 req/sec burst, 20 req/sec steady
   - Quota: 10,000 requests/day
3. Associate the plan with your stage and the API key
4. The frontend sends `x-api-key: YOUR_KEY` on every request to Gateway routes

The frontend changes needed (when ready to implement):
- `irEngine.ts` → add `"x-api-key": import.meta.env.VITE_API_GATEWAY_KEY` to `irFetch()` headers
- `ttsService.ts` → add the same header to the `fetch()` call in `pollySpeak()`
- Add `VITE_API_GATEWAY_KEY=your-key` to `.env.live`

---

## CORS

API Gateway must handle CORS independently — the browser preflight (`OPTIONS`) hits Gateway before it reaches Lambda.

For each resource in the console:
1. Select the resource (e.g. `/tts/synthesize`)
2. Actions → Enable CORS
3. Set `Access-Control-Allow-Origin` to your frontend domain (e.g. `https://d33ytnxd7i6mo9.cloudfront.net` or `http://localhost:3001` for dev)
4. Allow headers: `Content-Type,x-api-key`
5. Allow methods: `POST,OPTIONS`

Each Lambda response must also return CORS headers:

```python
headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "https://YOUR_FRONTEND_DOMAIN",
    "Access-Control-Allow-Headers": "Content-Type,x-api-key",
}
```

---

## Lambda 1 — `argus-tts-synthesize`

**Trigger:** `POST /tts/synthesize`
**Source file:** `backend/api/tts.py` (`TTSSynthesizeResource.post`)
**Runtime:** Python 3.11
**Timeout:** 15 seconds
**Memory:** 256 MB

### Environment variables

| Key | Value |
|---|---|
| `AWS_DEFAULT_REGION` | `us-east-1` |

No credentials needed — execution role handles Polly auth.

### Request shape (from frontend)

```json
{
  "text": "Two critical findings require immediate action.",
  "voice": "Matthew",
  "engine": "neural"
}
```

### Response

- Success: `200` with `Content-Type: audio/mpeg`, binary MP3 body
- Failure: `503` with `{"error": "synthesis unavailable", "fallback": true}`

### Lambda handler skeleton

```python
import os
import json
import base64
import boto3
from botocore.exceptions import BotoCoreError, ClientError

ALLOWED_VOICES = {"Matthew", "Joanna", "Stephen", "Ruth", "Brian", "Emma"}
MAX_CHARS = 3000
CORS_ORIGIN = os.environ.get("CORS_ALLOW_ORIGIN", "*")

def lambda_handler(event, context):
    body = json.loads(event.get("body") or "{}")
    text = (body.get("text") or "").strip()
    voice = body.get("voice", "Matthew")
    engine = body.get("engine", "neural")

    if not text:
        return _resp(400, {"error": "text is required"})

    if voice not in ALLOWED_VOICES:
        voice = "Matthew"
    if engine not in ("neural", "standard"):
        engine = "neural"
    if len(text) > MAX_CHARS:
        text = text[:MAX_CHARS]

    try:
        polly = boto3.client("polly", region_name=os.environ.get("AWS_DEFAULT_REGION", "us-east-1"))
        resp = polly.synthesize_speech(Text=text, OutputFormat="mp3", VoiceId=voice, Engine=engine)
        audio = resp["AudioStream"].read()
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "audio/mpeg",
                "Access-Control-Allow-Origin": CORS_ORIGIN,
            },
            "body": base64.b64encode(audio).decode("utf-8"),
            "isBase64Encoded": True,
        }
    except (BotoCoreError, ClientError) as e:
        return _resp(503, {"error": "synthesis unavailable", "fallback": True})

def _resp(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": CORS_ORIGIN},
        "body": json.dumps(body),
    }
```

**Important:** API Gateway must have binary media types enabled for `audio/mpeg`. In the console: API Settings → Binary Media Types → add `audio/mpeg`.

---

## Lambda 2 — `argus-voice-intent`

**Trigger:** `POST /voice/intent`
**Source file:** `backend/api/voice_intent.py` (`VoiceIntentResource.post`)
**Runtime:** Python 3.11
**Timeout:** 30 seconds (Bedrock can be slow on cold start)
**Memory:** 256 MB

### Environment variables

| Key | Value |
|---|---|
| `AWS_DEFAULT_REGION` | `us-east-1` |
| `BEDROCK_MODEL_ID` | `anthropic.claude-haiku-4-5-20251001` |

### Request shape

```json
{
  "utterance": "what is the current threat posture",
  "context_turns": [
    {"role": "user", "text": "brief me"},
    {"role": "agent", "text": "Threat level HIGH..."}
  ],
  "finding_context": {
    "severity": "CRITICAL",
    "finding_type": "UnauthorizedAccess:IAMUser",
    "resource_name": "arn:aws:iam::123456789012:user/svc-deploy",
    "service": "iam"
  }
}
```

### Response

```json
{
  "intent": "threat",
  "spoken_reply": "Threat level is currently HIGH with 3 critical findings active.",
  "args": null,
  "confidence": 0.94
}
```

Fallback on Bedrock failure: `503` with `{"error": "bedrock_unavailable", "fallback": true}`

### Lambda handler skeleton

```python
import os
import json
import boto3

VALID_INTENTS = {
    "briefing", "critical", "threat", "sla", "latest",
    "show_findings", "compliance", "scan", "help", "high",
    "isolate", "revoke", "disable_key", "navigate", "unknown",
}

SYSTEM_PROMPT = (
    "You are Argus, a voice-driven cloud security IR agent. "
    "Classify the utterance into exactly one of these intents: "
    "briefing, critical, threat, sla, latest, show_findings, compliance, scan, "
    "help, high, isolate, revoke, disable_key, navigate, unknown. "
    "Respond with ONLY valid JSON: "
    '{"intent": <string>, "spoken_reply": <string|null>, "args": <object|null>, "confidence": <float 0-1>}'
)

CORS_ORIGIN = os.environ.get("CORS_ALLOW_ORIGIN", "*")
MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-haiku-4-5-20251001")
REGION = os.environ.get("AWS_DEFAULT_REGION", "us-east-1")

def lambda_handler(event, context):
    body = json.loads(event.get("body") or "{}")
    utterance = (body.get("utterance") or "").strip()
    if not utterance:
        return _resp(400, {"error": "utterance is required"})

    context_turns = (body.get("context_turns") or [])[-3:]
    finding_context = body.get("finding_context") or None

    parts = []
    if finding_context:
        parts.append(
            f"Active finding: severity={finding_context.get('severity','UNKNOWN')}, "
            f"type={finding_context.get('finding_type','unknown')!r}, "
            f"resource={finding_context.get('resource_name','unknown')!r}"
        )
    for t in context_turns:
        parts.append(f"  [{t.get('role','user')}]: {t.get('text','').strip()}")
    parts.append(f'Classify: "{utterance}"')
    prompt = "\n".join(parts)

    try:
        client = boto3.client("bedrock-runtime", region_name=REGION)
        response = client.invoke_model(
            modelId=MODEL_ID,
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 256,
                "system": SYSTEM_PROMPT,
                "messages": [{"role": "user", "content": prompt}],
            }),
        )
        result = json.loads(response["body"].read())
        text = result["content"][0]["text"].strip()
        data = json.loads(text)
    except Exception:
        return _resp(503, {"error": "bedrock_unavailable", "fallback": True})

    intent = str(data.get("intent", "unknown"))
    if intent not in VALID_INTENTS:
        intent = "unknown"

    return _resp(200, {
        "intent": intent,
        "spoken_reply": str(data.get("spoken_reply") or "")[:500] or None,
        "args": data.get("args") if isinstance(data.get("args"), dict) else None,
        "confidence": max(0.0, min(1.0, float(data.get("confidence", 0.0)))),
    })

def _resp(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": CORS_ORIGIN},
        "body": json.dumps(body),
    }
```

---

## Lambda 3 — `argus-llm-triage`

**Trigger:** `POST /llm/triage`
**Source file:** `backend/api/ir.py` (`LLMTriageResource.post`)
**Runtime:** Python 3.11
**Timeout:** 60 seconds (Claude triage can take 10–20s on complex findings)
**Memory:** 512 MB

### Environment variables

| Key | Value |
|---|---|
| `AWS_DEFAULT_REGION` | `us-east-1` |
| `BEDROCK_MODEL_ID` | `anthropic.claude-haiku-4-5-20251001` |

### Request shape

```json
{
  "finding_id": "finding-abc123",
  "severity": "CRITICAL",
  "finding_type": "UnauthorizedAccess:IAMUser/TorIPCaller",
  "resource_name": "arn:aws:iam::123456789012:user/svc-deploy",
  "description": "API calls from known Tor exit node detected."
}
```

### Response

```json
{
  "job_id": "job-a1b2c3d4e5f6",
  "finding_id": "finding-abc123",
  "action_type": "llm_triage",
  "status": "succeeded",
  "approval_required": false,
  "result": {
    "triage_summary": "TRUE POSITIVE — high confidence...",
    "model": "anthropic.claude-haiku-4-5-20251001"
  }
}
```

### Lambda handler skeleton

```python
import os
import json
import uuid
import boto3
from datetime import datetime, timezone

MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-haiku-4-5-20251001")
REGION = os.environ.get("AWS_DEFAULT_REGION", "us-east-1")
CORS_ORIGIN = os.environ.get("CORS_ALLOW_ORIGIN", "*")

def lambda_handler(event, context):
    body = json.loads(event.get("body") or "{}")
    finding_id = body.get("finding_id", "unknown")

    prompt = (
        f"You are a cloud security incident responder. Triage this AWS security finding:\n"
        f"Finding ID: {finding_id}\n"
        f"Severity: {body.get('severity', 'Unknown')}\n"
        f"Type: {body.get('finding_type', 'Unknown')}\n"
        f"Resource: {body.get('resource_name', 'Unknown')}\n"
        f"Description: {body.get('description', 'No description provided')}\n\n"
        f"Respond with: 1) TRUE/FALSE POSITIVE assessment, 2) confidence score 0-1, "
        f"3) MITRE ATT&CK techniques, 4) immediate recommended actions. Be concise."
    )

    job_id = f"job-{uuid.uuid4().hex[:12]}"
    llm_response = None

    try:
        client = boto3.client("bedrock-runtime", region_name=REGION)
        response = client.invoke_model(
            modelId=MODEL_ID,
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1024,
                "messages": [{"role": "user", "content": prompt}],
            }),
        )
        result = json.loads(response["body"].read())
        llm_response = result["content"][0]["text"]
    except Exception:
        pass  # fall through to mock

    result_payload = (
        {"triage_summary": llm_response, "model": MODEL_ID}
        if llm_response
        else {
            "triage_summary": "TRUE POSITIVE with HIGH confidence. Source IP associated with Tor exit nodes.",
            "confidence_score": 0.97,
            "mitre_techniques": ["T1078", "T1530"],
            "model": "mock",
        }
    )

    return _resp(202, {
        "job_id": job_id,
        "finding_id": finding_id,
        "action_type": "llm_triage",
        "status": "succeeded",
        "approval_required": False,
        "result": result_payload,
    })

def _resp(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": CORS_ORIGIN},
        "body": json.dumps(body),
    }
```

---

## Deployment Steps (Console)

### Step 1 — Create the execution role

1. IAM console → Roles → Create role
2. Trusted entity: AWS service → Lambda
3. Skip managed policies — attach the inline policy from the IAM section above
4. Name: `ArgusVoiceLambdaRole`

### Step 2 — Create each Lambda function

For each of the 3 functions:

1. Lambda console → Create function → Author from scratch
2. Runtime: Python 3.11
3. Execution role: use existing → `ArgusVoiceLambdaRole`
4. Paste the handler code from the skeleton above
5. Set environment variables (region, model ID, CORS origin)
6. Set timeout and memory per the table at the top of each Lambda section
7. Deploy

### Step 3 — Add resources to the existing API Gateway

The project already has an API Gateway at `erh3a09d7l.execute-api.us-east-1.amazonaws.com` — **do not create a new one**. Open it in the console and add the 3 new resources:

1. API Gateway console → APIs → find `erh3a09d7l`
2. Resources → add the following:

```
/tts
  /synthesize    POST → Lambda proxy → argus-tts-synthesize
/voice
  /intent        POST → Lambda proxy → argus-voice-intent
/llm
  /triage        POST → Lambda proxy → argus-llm-triage
```

3. For each new resource: Actions → Enable CORS (set origin to your frontend domain)
4. API Settings → Binary Media Types → add `audio/mpeg` if not already present (required for Polly audio passthrough)

### Step 4 — API key + usage plan

1. API Keys → Create → name: `argus-dev-key`
2. Usage Plans → Create:
   - Name: `argus-dev`
   - Throttle: 50 req/sec burst, 20 req/sec steady
   - Quota: 10,000 req/day
3. Add stage to plan → add API key to plan

### Step 5 — Deploy

1. Actions → Deploy API
2. Stage name: redeploy the existing stage (e.g. `v1` or whichever stage `/auth` and `/scan` use)
3. The invoke URL is already `https://erh3a09d7l.execute-api.us-east-1.amazonaws.com/v1`

### Step 6 — Update frontend config

`VITE_API_GATEWAY_URL` in `irEngine.ts` and `voiceIntentService.ts` already falls back to `https://erh3a09d7l.execute-api.us-east-1.amazonaws.com/v1` — so if `VITE_IR_API_BASE` is not set, the existing gateway URL is used automatically.

If you want to be explicit, set in `.env.live`:

```
VITE_IR_API_BASE=https://erh3a09d7l.execute-api.us-east-1.amazonaws.com/v1
VITE_API_GATEWAY_KEY=your-api-key-value
```

The two frontend files that need the `x-api-key` header added when implementing:
- `src/services/irEngine.ts` → `irFetch()` headers
- `src/services/ttsService.ts` → `pollySpeak()` fetch headers

---

## Testing Each Lambda

### Testing — replace `{api-id}/dev` with the existing gateway

```bash
curl -X POST https://erh3a09d7l.execute-api.us-east-1.amazonaws.com/v1/tts/synthesize \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_KEY" \
  -d '{"text": "Two critical findings active.", "voice": "Matthew", "engine": "neural"}' \
  --output test-audio.mp3
```

Expected: `test-audio.mp3` plays back the spoken text.

### argus-voice-intent

```bash
curl -X POST https://erh3a09d7l.execute-api.us-east-1.amazonaws.com/v1/voice/intent \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_KEY" \
  -d '{"utterance": "what is the current threat level", "context_turns": [], "finding_context": null}'
```

Expected: `{"intent": "threat", "spoken_reply": "...", "confidence": 0.9+}`

### argus-llm-triage

```bash
curl -X POST https://erh3a09d7l.execute-api.us-east-1.amazonaws.com/v1/llm/triage \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_KEY" \
  -d '{
    "finding_id": "test-001",
    "severity": "CRITICAL",
    "finding_type": "UnauthorizedAccess:IAMUser",
    "resource_name": "arn:aws:iam::123456789012:user/test",
    "description": "Suspicious API calls from Tor exit node."
  }'
```

Expected: `{"status": "succeeded", "result": {"triage_summary": "...", "model": "anthropic.claude-haiku-4-5-20251001"}}`

---

## Follow-on Lambdas (out of scope for initial rollout)

These follow the exact same pattern as `argus-llm-triage`. Same execution role, same Bedrock call, different prompt:

| Lambda | Route | Notes |
|---|---|---|
| `argus-llm-root-cause` | `POST /llm/root-cause` | Root cause narrative prompt |
| `argus-llm-runbook` | `POST /llm/runbook` | 4-step IR playbook, structured JSON output |

---

## What Stays on Flask

Everything not listed above remains on the Flask container unchanged:

- All `/api/v1/aws/*` routes (IAM, EC2, S3, Security Hub, Config)
- `/api/v1/ir/actions/*` (job store, approval/rejection)
- `/api/v1/ir/forensics/*`, `/api/v1/ir/evidence/*`
- `/api/v1/ir/audit`
- `/api/v1/dashboard`, `/api/v1/scan-history`, `/api/v1/metrics`
- `/api/v1/automation/*`, `/api/v1/forensics/*`, `/api/v1/evidence/*`

The Flask `CORS_ALLOWED_ORIGINS` config in `app.py` does not need to change.

---

## Checklist

- [ ] `ArgusVoiceLambdaRole` created with inline policy (Bedrock + Polly + CloudWatch Logs)
- [ ] `argus-tts-synthesize` Lambda created, deployed, tested
- [ ] `argus-voice-intent` Lambda created, deployed, tested
- [ ] `argus-llm-triage` Lambda created, deployed, tested
- [ ] 3 new resources added to existing API Gateway (`erh3a09d7l`) — no new gateway created
- [ ] Binary media type `audio/mpeg` enabled on existing API (if not already present)
- [ ] CORS enabled on all 3 new resources
- [ ] API key + usage plan created and associated with stage
- [ ] Existing stage redeployed with new resources
- [ ] `VITE_IR_API_BASE` set to `https://erh3a09d7l.execute-api.us-east-1.amazonaws.com/v1` in `.env.live`
- [ ] `VITE_API_GATEWAY_KEY` added to `.env.live`
- [ ] `x-api-key` header added to `irFetch()` in `irEngine.ts`
- [ ] `x-api-key` header added to `pollySpeak()` in `ttsService.ts`
- [ ] End-to-end test: voice command → intent → triage card + Polly audio
- [ ] Promote to `staging` stage after dev validation
