# Voice Incident Response Agent — Planning Document

## Overview

A voice-driven incident response agent that allows security engineers to interact with the IAM Dashboard hands-free during active incidents. The shipped UI (`VoiceIRAgent.tsx`) uses the browser **Web Speech API** for speech-to-text: **push-to-talk** by default (mic button or quick commands), and an optional **“Hey Argus”** mode that uses `continuous: true` and only runs the command pipeline after the wake phrase appears in the transcript. Live findings come from the dashboard context; **Claude via Amazon Bedrock** and **Amazon Polly** are planned upgrades in later phases.

This extends the existing AI remediation engine (AI-3) with a real-time voice interface. No external wake word SDK is required for the browser path — optional wake phrase filtering is done on recognition text.

---

## Use Case

**Scenario:** A critical IAM finding fires at 2am. The on-call engineer opens the dashboard and says:

> "Hey Argus, give me a summary of all critical findings"

Argus responds verbally with a Claude-generated incident summary and recommended next steps — no clicking required.

---

## Wake phrase — "Hey Argus" (optional)

**Default:** `continuous: false` — one utterance per mic press (push-to-talk). Quick-command buttons bypass the mic and send text intents directly.

**Optional:** With **HEY ARGUS ON** in the live panel, recognition uses `continuous: true` while the panel is open and in voice mode. Final transcript segments are buffered until the text matches **“Hey Argus”** (case-insensitive); the remainder after the last wake match is passed to the same intent router as typed or push-to-talk input. Listening pauses during processing and TTS to reduce picking up playback. This is **not** a dedicated wake-word engine (no on-device keyword model); it is phrase detection on Web Speech API results.

```
Panel open + HEY ARGUS ON → Web Speech API continuous (browser only)
        │
        ▼
Final STT contains "hey argus" + command
        │
        ▼
Command text → intent match → buildResponse → browser TTS (today) / Polly (later)
```

**Why Web Speech API:**
- Built into Chrome and Edge — no install, no cost for STT in the browser path
- Runs in the browser; no AWS Transcribe usage until/unless you swap in Phase 4
- Sufficient for a controlled dashboard environment; false triggers possible on similar-sounding phrases
- Can be upgraded to Porcupine (Picovoice) or server-side verification later if needed

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│                                                                 │
│   Web Speech API — push-to-talk; optional continuous + "Hey Argus" filter │
│        │                                                        │
│        ▼  (wake phrase in STT text, if HEY ARGUS mode on)      │
│   Web Speech API captures full voice command                    │
│        │                                                        │
│        ▼                                                        │
│   Audio blob sent to backend via /api/voice/transcribe          │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (Python/Flask)                      │
│                                                                 │
│   /api/voice/transcribe                                         │
│        │                                                        │
│        ▼                                                        │
│   Amazon Transcribe ──► confirmed text transcript               │
│        │                                                        │
│        ▼                                                        │
│   Intent Router                                                 │
│   ├── "critical findings"  ──► pull from ScanResultsContext     │
│   ├── "summarize incident" ──► pull findings + metadata         │
│   └── "recommend fix for [resource]" ──► pull specific finding  │
│        │                                                        │
│        ▼                                                        │
│   Build AI Input Schema (existing AI-2 schema)                  │
│        │                                                        │
│        ▼                                                        │
│   Amazon Bedrock (Claude) ──► structured incident summary       │
│        │                                                        │
│        ▼                                                        │
│   Guardrails check (existing AI-3 pipeline)                     │
│        │                                                        │
│        ▼                                                        │
│   Amazon Polly ──► audio response (MP3)                         │
│        │                                                        │
│        ▼                                                        │
│   Return audio + text transcript to frontend                    │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│                                                                 │
│   Play audio response via <audio> element                       │
│   Display text transcript in incident panel                     │
│   Show findings table filtered to what was spoken about         │
└─────────────────────────────────────────────────────────────────┘
```

---

## AWS Services Required

| Service | Role |
|---|---|
| Web Speech API (browser) | STT + optional wake phrase on transcript; push-to-talk — free, no AWS |
| Amazon Transcribe | Confirms transcript server-side for accuracy |
| Amazon Polly | Text-to-speech — Argus speaks back |
| Amazon Bedrock (Claude) | LLM for incident summarization and remediation |
| Existing backend | Findings data source — already running |

---

## Full Cost Breakdown

### Web Speech API (browser STT)

**Free** for the browser STT path. No AWS usage until you add Transcribe or other backend voice endpoints.

---

### Amazon Transcribe (Speech-to-Text)

| Tier | Price |
|---|---|
| Standard streaming/batch | $0.024 / minute |
| Free tier (first 12 months) | 60 minutes / month free |

Each voice command is typically a few seconds of audio (push-to-talk or phrase after “Hey Argus”).

- 100 queries/month ≈ **$0.04**
- 1000 queries/month ≈ **$0.40**

---

### Amazon Polly (Text-to-Speech)

| Voice Type | Price | Free Tier (12 months) |
|---|---|---|
| Standard voices | $4.00 / 1M characters | 5M characters/month |
| Neural voices (more natural) | $16.00 / 1M characters | 1M characters/month |

Each Argus response is ~500-800 characters.

- 100 responses/month ≈ **$0.003** (Standard) / **$0.013** (Neural)
- 1000 responses/month ≈ **$0.03** (Standard) / **$0.13** (Neural)

**Recommendation:** Use Neural voices — the cost difference is negligible and the quality is significantly better for a security tool.

---

### Amazon Bedrock — Claude

| Model | Input | Output | Use |
|---|---|---|---|
| Claude 3 Haiku | $0.25 / 1M tokens | $1.25 / 1M tokens | Local dev / testing |
| Claude 3.5 Sonnet | $3.00 / 1M tokens | $15.00 / 1M tokens | Production |

Each voice query sends ~1500 tokens total (findings context + prompt + response).

- 100 queries/month ≈ **$0.04** (Haiku) / **$0.40** (Sonnet)
- 1000 queries/month ≈ **$0.40** (Haiku) / **$4.00** (Sonnet)

**Strategy:** Use Haiku for local Docker testing, swap to Sonnet for production via a single env var change.

---

### Total Estimated Monthly Cost

| Volume | Transcribe | Polly (Neural) | Claude Haiku | Claude Sonnet | Total (Haiku) | Total (Sonnet) |
|---|---|---|---|---|---|---|
| 100 queries | $0.04 | $0.013 | $0.04 | $0.40 | **~$0.09** | **~$0.45** |
| 1000 queries | $0.40 | $0.13 | $0.40 | $4.00 | **~$0.93** | **~$4.53** |

For a dev/demo environment this is essentially free. Free tiers on Transcribe and Polly cover the first 12 months of light usage entirely.

> Note: Amazon Lex is not needed for the current MVP. Web Speech API handles capture in-browser; optional “Hey Argus” is transcript filtering, not a Lex-style intent model. Lex would only be needed for complex multi-turn conversations.

---

## Local Docker Infrastructure

### New service: `voice-agent`

Add to `docker-compose.yml`:

```yaml
voice-agent:
  build:
    context: .
    dockerfile: Dockerfile.voice
  ports:
    - "5001:5001"
  environment:
    - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
    - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
    - AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION}
    - BEDROCK_MODEL_ID=${BEDROCK_MODEL_ID}
  depends_on:
    - backend
  volumes:
    - ./backend:/app
```

### New env vars needed in `.env`

```
# Use Haiku for local dev, Sonnet for production
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
# BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0

# AWS keys already exist in .env for existing services
```

### New file: `Dockerfile.voice`

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    boto3 flask flask-cors
COPY backend/ .
EXPOSE 5001
CMD ["python", "voice_agent.py"]
```

---

## New Backend Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/voice/transcribe` | POST | Accepts audio blob, returns confirmed transcript |
| `/api/voice/respond` | POST | Accepts transcript + findings context, returns audio + text |
| `/api/voice/synthesize` | POST | Accepts text, returns Polly audio |

---

## New Frontend Components

| Component | Description |
|---|---|
| `VoiceIRAgent.tsx` | Main UI — ARGUS pill, live panel, optional **HEY ARGUS ON** toggle, push-to-talk mic, quick commands, audit log |

### Wake phrase filtering (`VoiceIRAgent.tsx`)

```ts
// Buffered final segments; command = text after last "hey argus" match
const cmd = extractCommandAfterLastWake(passiveBuffer);
if (cmd && !processing.current) {
  passiveBuffer = "";
  recognition.stop();
  processCommand(cmd, confidence);
}
```

Push-to-talk and quick commands call `processCommand` directly without requiring the wake phrase. The status line distinguishes passive wake listening vs push-to-talk.

---

## Intent Examples

| Voice Input | Intent | Action |
|---|---|---|
| "Hey Argus, give me a summary of critical findings" | `SUMMARIZE_CRITICAL` | Pull Critical findings → Claude summary |
| "Hey Argus, what are the high severity IAM issues" | `FILTER_FINDINGS` | Filter by severity=High, type=IAM |
| "Hey Argus, recommend a fix for [resource name]" | `REMEDIATE_FINDING` | Find matching finding → AI-3 pipeline |
| "Hey Argus, how many findings from the last scan" | `SCAN_STATS` | Return scan summary stats |

---

## Guardrails

The voice agent reuses the existing **AI-3 guardrails pipeline** (see `Guardrails & Safety Rules.md`):

- All Claude responses go through schema validation
- `requires_review: true` always — Argus never auto-remediates
- Voice responses are read-only summaries and recommendations
- No AWS API calls are triggered by voice commands in MVP

---

## MVP Scope

- [x] Optional wake phrase path — "Hey Argus" via Web Speech API (`continuous` + transcript filter in `VoiceIRAgent.tsx`)
- [ ] `/api/voice/transcribe` endpoint using Amazon Transcribe
- [ ] `/api/voice/respond` endpoint — intent routing + Claude (Bedrock) + Polly synthesis
- [x] `VoiceIRAgent.tsx` — listening indicators, transcript, optional Hey Argus mode, browser TTS
- [ ] Docker service wired up with env vars
- [ ] 4 core intents: summarize critical, filter by severity, scan stats, recommend fix

## Out of Scope (MVP)

- Multi-turn conversation
- Auto-remediation via voice
- Voice authentication / speaker recognition
- Mobile push alerts
- Custom wake word model (Porcupine) — upgrade path if needed

---

## What You Need to Get Started

1. **AWS credentials** — already in `.env`, need the following permissions added to your IAM role:
   - `transcribe:StartStreamTranscription`
   - `polly:SynthesizeSpeech`
   - `bedrock:InvokeModel`
2. **Enable Claude on Bedrock** — AWS Console → Bedrock → Model Access → request Claude 3 Haiku (free, instant approval)
3. **Browser** — Chrome or Edge required for Web Speech API (`webkitSpeechRecognition`)
4. **No new API keys needed** — everything runs through your existing AWS credentials

---

## Implementation Timeline

### ✅ Phase 1 — UI/UX Placement (COMPLETE)
- [x] `src/components/ir/VoiceIRAgent.tsx` built and placed
- [x] "ARGUS" header pill with threat indicator and live status
- [x] Waveform animation — active pulse when listening/speaking
- [x] Live transcript panel with user/agent message bubbles
- [x] Audit log tab — STT, TTS, intent entries with session dividers, export to `.log`
- [x] Quick command buttons — SITREP, CRITICAL, THREAT, SLA, HIGH RISK, SCAN
- [x] Text input fallback for non-mic environments
- [x] Keyboard shortcut — backtick `` ` `` to toggle panel
- [x] Web Speech API — push-to-talk + optional continuous listening with "Hey Argus" transcript filter (`webkitSpeechRecognition`)
- [x] Browser TTS via `SpeechSynthesisUtterance` (Polly upgrade path ready)
- [x] Intent router — 11 intents: briefing, critical, threat, sla, latest, compliance, scan, high, isolate, navigate, help
- [x] Live findings data wired via `useActiveScanResults` hook
- [x] SLA breach detection logic
- [x] Confidence score display on STT entries

**Status:** Frontend fully functional with local browser TTS and Web Speech API

---

### Phase 2 — AWS Setup (Next)
- [ ] AWS Console → Bedrock → Model Access → enable Claude 3 Haiku (free, ~2 min)
- [ ] Add IAM permissions to your role:
  - `bedrock:InvokeModel`
  - `transcribe:StartStreamTranscription`
  - `polly:SynthesizeSpeech`
- [ ] Check free tier status at `console.aws.amazon.com/billing/home#/freetier`
- [ ] Add `BEDROCK_MODEL_ID` to `.env` and `env.example`
- [ ] Verify: `aws bedrock list-foundation-models --region us-east-1`

**Deliverable:** AWS permissions confirmed, Bedrock model accessible

---

### Phase 3 — Backend Endpoints (Next)
- [ ] Create `backend/voice_agent.py`
- [ ] `/api/voice/transcribe` — accepts audio blob → Amazon Transcribe → returns text
- [ ] `/api/voice/respond` — intent + findings context → Claude (Bedrock) → guardrails → returns structured response
- [ ] `/api/voice/synthesize` — text → Amazon Polly Neural → returns MP3
- [ ] Add `voice-agent` service to `docker-compose.yml`
- [ ] Add `Dockerfile.voice`
- [ ] Test each endpoint with curl/Postman

**Deliverable:** All 3 endpoints working in Docker

---

### Phase 4 — Upgrade Argus to AWS APIs (Next)
- [ ] Swap browser `SpeechSynthesisUtterance` → Polly Neural voice in `VoiceIRAgent.tsx`
- [ ] Swap `webkitSpeechRecognition` → Amazon Transcribe for higher accuracy
- [ ] Wire Claude (Bedrock) responses into `buildResponse()` for dynamic LLM answers
- [ ] End-to-end test: "Hey Argus, brief me" → Transcribe → Claude → Polly audio

**Deliverable:** Full AWS-powered pipeline replacing browser APIs

---

### Phase 5 — Testing & Polish (Final)
- [ ] Test all 11 intents with AWS APIs
- [ ] Test edge cases — no findings, bad audio, API timeouts
- [ ] Verify AI-3 guardrails fire on Claude responses
- [ ] Swap `BEDROCK_MODEL_ID` to Claude 3.5 Sonnet for production quality
- [ ] Cross-browser test (Chrome required for Web Speech API fallback)

**Deliverable:** Argus production-ready

---

### Summary Timeline

| Phase | Status | Focus | Owner |
|---|---|---|---|
| Phase 1 — UI/UX | ✅ Complete | VoiceIRAgent.tsx, Web Speech API, browser TTS | Frontend |
| Phase 2 — AWS Setup | 🔲 Next | Bedrock access, IAM permissions | DevOps/Security |
| Phase 3 — Backend | 🔲 Next | voice_agent.py, 3 endpoints, Docker | Backend |
| Phase 4 — AWS Upgrade | 🔲 Next | Swap browser APIs → Transcribe + Polly + Claude | Frontend + Backend |
| Phase 5 — Testing | 🔲 Next | Guardrails, edge cases, production model | AI team + QA |

---

## Team Ownership

| Area | Owner |
|---|---|
| Voice backend endpoints | Backend team |
| Claude (Bedrock) integration + guardrails | AI team |
| Frontend voice UI + wake toggle (`VoiceIRAgent.tsx`) | Frontend team |
| AWS Transcribe/Polly/Bedrock IAM permissions | DevOps/Security team |
