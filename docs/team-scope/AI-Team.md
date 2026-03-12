# AI Team Charter — Hybrid Remediation & Chatbot

**Project Lead:** Dylan · **Team Size:** 3 · **Deadline:** April 17, 2026

---

## Team Mission

To deliver a high-transparency decision support tool that combines automated rule-based detection with LLM-generated educational insights, empowering junior engineers to secure AWS IAM environments with confidence.


Dylan - "AI can cover our blind spots and amplify what we're already good at. This project is designed around that idea. If we understand what the AI is doing and why, we become better engineers — and that's exactly 
         the kind of edge that gets you the position you want."
---

## In Scope (Semester)

| Feature | Description |
|---------|-------------|
| **Hybrid Controller** | Central logic that routes findings to either the Rule Engine or LLM based on complexity. |
| **Rule Engine** | Deterministic Python scripts to detect "Hard Rules" (e.g., Wildcard permissions, unencrypted buckets). |
| **LLM Integration** | GPT-4o/Claude 3.5 implementation to provide plain-language security context and "Why" explanations. |
| **Chatbot Widget** | A persistent UI component supporting file/snippet uploads and interactive security Q&A. |
| **Insights Icons** | Triggers throughout the dashboard that display context-aware AI findings for specific views. |
| **Split-View UI** | A side-by-side "Original vs. Proposed" interface with an Approve/Reject workflow. |
| **Security Scoring** | AI-driven severity levels (High/Med/Low) for every identified vulnerability. |

---

## Out of Scope

- **Unsupervised Auto-fixes:** The AI will never push changes to AWS without explicit user approval.
- **Production Deployment:** Deliverables are focused on a demo-ready build in a local/dev environment.
- **Core Auth:** User authentication and account management are handled by the Foundation team.

---

## Interview-Ready Outcomes

When describing this work to recruiters or hiring managers, use these performance-based descriptions:

- **Architected a Hybrid AI Engine:** Engineered a system that used rule-based logic for deterministic fixes and LLMs for nuanced context, balancing speed with intelligence.
- **Implemented Human-in-the-Loop AI:** Developed a "Split-View" approval flow, ensuring that AI-generated security remediations were reviewed and authorized by a human operator.
- **Engineered Prompt Strategies:** Designed specific prompts to translate complex AWS IAM JSON policies into plain-language educational insights for junior developers.
- **Led a Specialized Technical Team:** Directed a team of three through the full development lifecycle, from API architecture to frontend integration, within a larger 7-team organization.
- **Optimized Cost & Latency:** Built controller logic that prioritized local rule-based checks, minimizing expensive API calls while maintaining high accuracy.

---

## Task Delegation

| Role | Owner | Primary Responsibility |
|------|-------|------------------------|
| **Lead (Arch & LLM)** | Dylan | Controller logic, Prompt Engineering, API Orchestration, Repo Mgmt. |
| **Frontend & UI** | Member (TBD) | Chat Widget, Split-View UI, Insights Icons, Frontend-to-AI API Client. |
| **Logic & Data** | Member (TBD) | Rule Engine development, Data Sanitization, IAM Policy Parsing. |

---

## Definition of Done (Demo-Level)

- **End-to-End Detection:** System identifies one rule-based error and one nuanced error in a live demo.
- **Contextual Remediation:** LLM provides a valid code fix and a plain-language "Why" explanation.
- **User Agency:** User can successfully approve or reject a fix via the Split-View UI.
- **Interactive Chat:** Chatbot handles a file upload and answers a follow-up question accurately.
- **Stability:** The full flow runs within [Target Latency] seconds without pre-loaded results.

---

## Weekly Cadence

| Day | Activity |
|-----|----------|
| **Monday** | Sync with Main Dashboard/Security teams to align on data schemas. |
| **Wednesday** | Internal AI Team code review and LLM prompt stress-testing. |
| **Thursday** | Weekly Demo (PMO-led); present latest functional AI features. |
| **Friday** | Documentation updates and merging stable features into the dev branch. |

---

## Folder Structure

All AI work lives inside the existing IAM-Dashboard repo. Repo: [github.com/AWS-IAM-Dashboard/IAM-Dashboard](https://github.com/AWS-IAM-Dashboard/IAM-Dashboard)

```
backend/
├── api/ai/                    ← API endpoints
│   ├── remediation.py         # Remediation endpoints
│   └── chat.py                # Chatbot endpoints
└── services/ai/               ← Core logic (all three contribute)
    ├── remediation/           # Rule engine + LLM suggestions
    │   ├── rule_engine.py      # Member B: hard rules
    │   ├── llm_handler.py      # Dylan: LLM integration
    │   └── controller.py       # Dylan: orchestration
    ├── chat/                  # Chat orchestration, conversation state
    ├── prompts/               # Prompt templates
    └── schemas/               # Output schemas (keeps responses stable)

src/
├── components/ai/             ← Member A: UI components
│   ├── InsightsIcon.tsx       # Icon for section-level AI insights
│   ├── ChatbotWidget.tsx      # Hovering chat icon + window
│   └── SplitView.tsx         # Original vs remediated
└── services/ai/               # API client for AI endpoints
```

---

## Success Metrics

- **Accuracy** — % of errors the rule-based layer catches correctly
- **Latency** — Average LLM response time for remediation suggestions
- **User satisfaction** — Qualitative before vs. after; does it add value?

---

## What the User Gets

- **Security level** — Clear indicator of severity (High/Med/Low)
- **Recommendations** — Actionable next steps, not just flags
- **Context** — Plain-language explanation so the user learns

Dylan - "The goal is accurate, useful AI output that adds real value. If it doesn't help us make a better decision, it doesn't belong in the tool."
