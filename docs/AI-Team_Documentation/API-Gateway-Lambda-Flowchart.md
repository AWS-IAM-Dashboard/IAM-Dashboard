# API Gateway + Lambda — Flow & Checklist
## Argus Voice: TTS, Voice Intent, LLM Triage

**Status:** In Progress
**Ref doc:** `API-Gateway-Lambda-Integration.md`
**Approach:** All infrastructure via Terraform (IaC only — no console changes)

---

## End-to-End Request Flow

```mermaid
flowchart TD
    A([User — push-to-talk or quick command]) --> B[Browser Web Speech API]
    B --> C[processCommand in VoiceIRAgent.tsx]
    C --> D{useVoiceIntent — Tier 1}
    D -->|regex match found| E[buildResponse — local intent]
    D -->|unknown| F[POST /voice/intent]

    F --> GW1[API Gateway\nPOST /voice/intent]
    GW1 --> L2[Lambda: argus-voice-intent]
    L2 --> BD1[Amazon Bedrock\nClaude — intent classification]
    BD1 --> L2
    L2 --> GW1
    GW1 --> F
    F --> E

    E --> TTS{pollySpeak}
    TTS -->|VITE_DATA_MODE=live| GW2[API Gateway\nPOST /tts/synthesize]
    TTS -->|mock or error| BTTS[Browser SpeechSynthesisUtterance fallback]
    GW2 --> L1[Lambda: argus-tts-synthesize]
    L1 --> POLLY[Amazon Polly Neural\naudio/mpeg]
    POLLY --> L1
    L1 --> GW2
    GW2 --> AUDIO[Audio plays in browser]
    BTTS --> AUDIO

    E --> LLM{briefing / critical / threat intent?}
    LLM -->|yes| GW3[API Gateway\nPOST /llm/triage]
    LLM -->|no| DONE([Response card shown — done])
    GW3 --> L3[Lambda: argus-llm-triage]
    L3 --> BD2[Amazon Bedrock\nClaude — triage summary]
    BD2 --> L3
    L3 --> GW3
    GW3 --> CARD[LLMTriageCard rendered in panel]
    CARD --> DONE
```

---

## AWS Infrastructure Flow

```mermaid
flowchart LR
    subgraph Frontend
        FE[React App\nVITE_IR_API_BASE → Gateway URL]
    end

    subgraph API_Gateway[Amazon API Gateway — erh3a09d7l  existing gateway]
        R0[existing: /auth /scan — unchanged]
        R1[NEW: POST /llm/triage]
        R2[NEW: POST /llm/root-cause]
        R3[NEW: POST /llm/runbook]
        THROTTLE[Throttle: 10 burst / 5 rps]
    end

    subgraph Lambda[iam-dashboard-scanner  existing Lambda]
        LH[_handle_llm_triage\n_handle_llm_root_cause\n_handle_llm_runbook]
        SSM_FETCH[_get_bedrock_api_key\n_get_bedrock_model_id\nfrom SSM]
    end

    subgraph IAM[IAM — iam-dashboard-lambda-role]
        ROLE[Existing execution role]
        POL[Updated policy\nssm:GetParameter\nbedrock:InvokeModel\nkms:Decrypt already present]
    end

    subgraph SSM[SSM Parameter Store]
        P1[/iam-dashboard/dev/bedrock-api-key\nSecureString — from GitHub secret]
        P2[/iam-dashboard/dev/bedrock-model-id\nString — Terraform managed]
    end

    subgraph AWS_Services[AWS Services]
        BEDROCK[Amazon Bedrock\nClaude Haiku 4.5]
        CW[CloudWatch Logs\n/aws/lambda/iam-dashboard-scanner]
    end

    subgraph Flask[Flask Container — unchanged]
        FLASK[All other routes\n/aws/* /ir/* /tts/* /voice/* etc.]
    end

    FE -->|existing gateway URL| R1
    FE -->|existing gateway URL| R2
    FE -->|existing gateway URL| R3

    R1 --> LH
    R2 --> LH
    R3 --> LH

    LH --> SSM_FETCH
    SSM_FETCH --> P1
    SSM_FETCH --> P2
    ROLE --> LH
    POL --> ROLE

    LH --> BEDROCK
    LH --> CW

    FE -->|direct — no Gateway| FLASK
```

---

## Deployment Checklist

All steps are IaC via Terraform. CI deploys on merge to `main`. No console changes.

---

### 1. IAM — Lambda Role Policy ✅ Done

- [x] `infra/lambda/lambda-role-policy.json` — `ssm:GetParameter` scoped to both SSM parameter paths
- [x] `BedrockInvokeModel` scoped to `anthropic.claude-haiku-4-5-20251001`
- [x] `kms:Decrypt` already present — covers SecureString decryption

---

### 2. Lambda — `iam-dashboard-scanner` ✅ Done

- [x] `_get_bedrock_api_key()` — fetches from SSM, warm-instance cached
- [x] `_get_bedrock_model_id()` — fetches from SSM, falls back to Haiku default
- [x] `_get_bedrock_client()` — uses SSM key, no hardcoded credentials
- [x] `_handle_llm_triage()`, `_handle_llm_root_cause()`, `_handle_llm_runbook()` added
- [x] `lambda_handler` routing added for `llm-triage`, `llm-root-cause`, `llm-runbook`

---

### 3. SSM Parameters — IaC ✅ Done

- [x] `aws_ssm_parameter.bedrock_api_key` — `/iam-dashboard/dev/bedrock-api-key` (SecureString, `lifecycle ignore_changes`)
- [x] `aws_ssm_parameter.bedrock_model_id` — `/iam-dashboard/dev/bedrock-model-id` (String)
- [x] Both vars declared in `infra/lambda/variables.tf` and `infra/variables.tf`
- [x] Both vars passed through `infra/main.tf` to `module "lambda"`

---

### 4. CI Workflow ✅ Done

- [x] `TF_VAR_bedrock_api_key_placeholder: ${{ secrets.BEDROCK_API_KEY }}` added to both `plan` and `apply` jobs in `terraform-apply.yml`

---

### 5. API Gateway Routes ✅ Done

- [x] `POST /llm/triage`, `POST /llm/root-cause`, `POST /llm/runbook` added to `infra/api-gateway/main.tf`
- [x] Per-route throttle settings: burst 10, rate 5 req/s

---

### 6. Add GitHub Secret ⬜ Pending (human step)

- [ ] GitHub → repo → Settings → Secrets → Actions → New secret
- [ ] Name: `BEDROCK_API_KEY` — Value: key from AWS Bedrock console

---

### 7. Deploy via CI ⬜ Pending

- [ ] Merge to `main`
- [ ] Confirm CI `plan` step passes in GitHub Actions
- [ ] Confirm CI `apply` step completes successfully

---

### 8. Smoke Test ⬜ Pending

- [ ] `POST /llm/triage` returns `model` ≠ `"mock"`
- [ ] `POST /llm/root-cause` returns `model` ≠ `"mock"`
- [ ] `POST /llm/runbook` returns 4-step `runbook_steps`, `model` ≠ `"mock"`
- [ ] CloudWatch Logs → `/aws/lambda/iam-dashboard-scanner` — no SSM or Bedrock errors

---

### 9. Frontend Config ⬜ Pending

- [ ] Confirm `VITE_IR_API_BASE=https://erh3a09d7l.execute-api.us-east-1.amazonaws.com/v1` in `.env.live`
- [ ] Rebuild frontend: `docker compose build --no-cache frontend`

---

### 10. Promote to Staging ⬜ Pending

- [ ] Update Terraform staging vars with new secrets
- [ ] Re-run smoke tests against staging Gateway URL
- [ ] Update `Voice-Incident-Response-Agent.md` Phase 4 checklist

---

## Quick Reference

| Item | Value |
|---|---|
| Lambda function | `iam-dashboard-scanner` (existing) |
| Lambda role | `iam-dashboard-lambda-role` (existing, updated policy) |
| Bedrock model | `anthropic.claude-haiku-4-5-20251001` |
| SSM key path | `/iam-dashboard/dev/bedrock-api-key` |
| SSM model path | `/iam-dashboard/dev/bedrock-model-id` |
| Existing API Gateway ID | `erh3a09d7l` |
| Existing Gateway URL | `https://erh3a09d7l.execute-api.us-east-1.amazonaws.com/v1` |
| LLM throttle | burst 10 / rate 5 req/s |
| CloudWatch log group | `/aws/lambda/iam-dashboard-scanner` |
| CI workflow | `.github/workflows/terraform-apply.yml` |
| GitHub secret needed | `BEDROCK_API_KEY` |
