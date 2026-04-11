# Voice Incident Response Agent — Planning Document

## Overview

A voice-driven incident response agent that allows security engineers to interact with the IAM Dashboard hands-free during active incidents. The agent uses the browser's built-in **Web Speech API** to listen for the wake word **"Hey Argus"**, then pulls live scan findings from the backend, passes them to **Claude via Amazon Bedrock** for summarization and remediation guidance, and speaks back a structured response via **Amazon Polly**.

This extends the existing AI remediation engine (AI-3) with a real-time voice interface. No external wake word service needed — everything runs in the browser natively.

---

## Use Case

**Scenario:** A critical IAM finding fires at 2am. The on-call engineer opens the dashboard and says:

> "Hey Argus, give me a summary of all critical findings"

Argus responds verbally with a Claude-generated incident summary and recommended next steps — no clicking required.

---

## Wake Word — "Hey Argus"

The browser continuously listens using the **Web Speech API** (built into Chrome/Edge, free, no AWS cost). It only activates the full pipeline when it detects the wake word **"Hey Argus"**.

```
Browser always listening (Web Speech API — free, runs locally)
        │
        ▼
Detects "hey argus" wake word
        │
        ▼
Full Argus pipeline activates
        │
        ▼
User speaks command → captured and sent to backend
```

**Why Web Speech API:**
- Built into Chrome and Edge — no install, no cost
- Runs entirely in the browser, no audio sent to AWS until wake word is detected
- Sufficient accuracy for a controlled dashboard environment
- Can be upgraded to Porcupine (Picovoice) later if false triggers become an issue

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│                                                                 │
│   Web Speech API — always listening for "Hey Argus"            │
│        │                                                        │
│        ▼  (wake word detected)                                  │
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
| Web Speech API (browser) | Wake word detection + voice capture — free, no AWS |
| Amazon Transcribe | Confirms transcript server-side for accuracy |
| Amazon Polly | Text-to-speech — Argus speaks back |
| Amazon Bedrock (Claude) | LLM for incident summarization and remediation |
| Existing backend | Findings data source — already running |

---

## Full Cost Breakdown

### Web Speech API (Wake Word)

**Free.** Runs entirely in the browser. No AWS usage, no API calls until wake word is detected.

---

### Amazon Transcribe (Speech-to-Text)

| Tier | Price |
|---|---|
| Standard streaming/batch | $0.024 / minute |
| Free tier (first 12 months) | 60 minutes / month free |

Each voice command after wake word is ~5-10 seconds of audio.

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

> Note: Amazon Lex is not needed. Web Speech API handles wake word + capture. Simple Python intent matching handles routing. Lex would only be needed for complex multi-turn conversations.

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
| `ArgusVoicePanel.tsx` | Main UI — wake word status indicator, transcript display, audio playback |
| `useArgus.ts` | Hook — Web Speech API wake word listener, audio capture, pipeline trigger |

### Wake Word Implementation (useArgus.ts)

```ts
// Simplified wake word detection using Web Speech API
const recognition = new webkitSpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;

recognition.onresult = (event) => {
  const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
  if (transcript.includes("hey argus")) {
    // Wake word detected — capture next command
    activateArgus();
  }
};
```

The UI shows a subtle indicator when Argus is listening vs active.

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

- [ ] Wake word detection — "Hey Argus" via Web Speech API
- [ ] `/api/voice/transcribe` endpoint using Amazon Transcribe
- [ ] `/api/voice/respond` endpoint — intent routing + Claude (Bedrock) + Polly synthesis
- [ ] `ArgusVoicePanel.tsx` — listening indicator + transcript + audio playback
- [ ] `useArgus.ts` hook — Web Speech API wake word + capture
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

## Team Ownership

| Area | Owner |
|---|---|
| Voice backend endpoints | Backend team |
| Claude (Bedrock) integration + guardrails | AI team |
| Frontend wake word UI + useArgus hook | Frontend team |
| AWS Transcribe/Polly/Bedrock IAM permissions | DevOps/Security team |
