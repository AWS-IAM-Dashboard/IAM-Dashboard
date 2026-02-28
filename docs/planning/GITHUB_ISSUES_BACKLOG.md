# GitHub Issues Backlog — IAM Dashboard (Semester-Safe)

**Repo:** https://github.com/AWS-IAM-Dashboard/IAM-Dashboard

## Context
- **Team size:** 25 total  
  - **PMO:** 3  
  - **Delivery teams:** Backend, Frontend, Security, DevOps, Data, AI (≈3–4 each)
- **Timeline:** ~9 weeks (**Feb 17 – Apr 17**)
- **Goal:** Ship a real, demoable platform.

---

# 🚨 Semester Backlog Rule (Non-Negotiable)

**Only issues labeled `(SEMESTER)` are created and worked on this term.**  
Anything labeled `(POST)` is a parking lot for after Apr 17 and **must not** be created as a GitHub issue this semester.

If unsure → mark it `(POST)`.

---

# Product Goal (North Star)

> **IAM Dashboard lets a student or junior security engineer log in, scan an AWS account, see trustworthy IAM risks, get clear remediation guidance (with confidence), and export a review-ready report — even on mobile.**

---

# End-of-Semester Demo Criteria (Definition of Success)

We win if we can demo this live:

1. Visit landing page  
2. Log in with Cognito  
3. Run a scan  
4. Refresh page → findings persist  
5. See IAM risks with severity  
6. Click a finding → remediation + why it matters + confidence  
7. View severity trends in Grafana  
8. **Export a PDF security summary**

---

# Roadmap (Semester Milestones — Locked)

| Milestone | Weeks | Focus |
|---|---|---|
| **P0** | Week 0 | Onboarding + first PRs |
| **M1** | Week 1 | CI green + dev stability |
| **M2** | Week 2 | Auth spine (Cognito + JWT) |
| **M3** | Week 3 | Landing + login UX |
| **M4** | Weeks 4–5 | Quality sprint (schema, FPs, dashboard, mobile, refresh-safe) |
| **M5** | Weeks 6–7 | Multi-account *lite* + RBAC |
| **M6** | Weeks 8–9 | Data reporting + AI v1 + DevOps polish |

---

## P0 Requirement: Team Scope & Ownership

During **P0**, each department must submit **one short document** that defines its responsibilities for the semester.

- **One document per department** (not per person)
- **Max ~1 page**
- **Authored by the team lead with team input**
- **Reviewed by PMO**
- Stored in `/docs/team-scope/`

### Purpose
- Align ownership before implementation
- Surface dependencies early
- Reduce rework and cross-team friction in M2–M4

### Required Sections
Each document must include:

- **Team Mission** (1–2 sentences)
- **In Scope (Semester)**
- **Out of Scope (Implied)**
- **Key Dependencies**
- **Risks & Assumptions**
- **Definition of Done (Demo-level)**

These documents are **alignment tools**, not deliverables.  
Work begins immediately after submission.

## Dependencies & Bottlenecks (Read Before Picking Issues)

This section highlights **known dependencies** and **common bottlenecks** so teams can plan work without blocking each other.

### Core Dependency Rules
- If you are blocked by another milestone, **do not wait** — pick another `(SEMESTER)` issue in the same milestone.
- Backend must publish **early contracts** (auth responses, findings schema v0) to unblock other teams.
- PMO is responsible for re-routing work when a dependency stalls.

---

### Known Cross-Team Dependencies

| Depends On | Blocking Work | Affected Teams |
|----------|--------------|----------------|
| **CI Green (F1)** | Reliable PRs & merges | All teams |
| **Cognito Infra (B6)** | OAuth login, JWT auth | Frontend, Security |
| **OAuth Flow (B7)** | Session handling | Frontend |
| **JWT Validation (B10)** | RBAC enforcement | Security, Frontend |
| **Findings Schema (B13)** | Dashboards, metrics, AI inputs | Frontend, Data, AI |
| **Latest Scan API (B14b)** | Refresh-safe dashboard | Frontend |
| **Metrics Endpoint (B18)** | Prometheus & Grafana | Data |
| **Account APIs (B12)** | Account UI & switcher | Frontend |
| **RBAC (B9)** | Secure multi-user access | Security |
| **API Gateway auth (S17)** | Scan endpoints protected | Frontend, DevOps |
| **AI remediation (AI-5, AI-7)** | Remediation text to review | Security (S26) |
| **Terraform CI/CD (D14)** | Infra applies on merge | Backend (B6), all infra work |
| **MailHog (D16)** | Local email testing | Backend (B19), Frontend (W12) |

---

### Common Bottlenecks & How We Avoid Them

| Risk | Why It Hurts | Mitigation |
|----|-------------|-----------|
| CI stays red | Blocks all merges | Fix F1 before feature work |
| Auth work on one person | Blocks 4+ teams | Split B6 / B7 / B10 |
| Unstable findings schema | Rework across teams | Publish schema v0 early |
| Frontend waiting on backend | Idle contributors | Parallelize UI polish & mocks |
| AI starts too late | Rushed integration | Prep early, integrate in M6 |

---

### What to Do If You’re Blocked
1. Pick another `(SEMESTER)` issue in the same milestone  
2. Notify PMO in standup  
3. PMO reassigns or escalates within 24 hours

This is **expected behavior**, not failure.

# Teams

## Backend (≈3)
- Cognito OAuth + JWT validation
- Unified findings schema
- APIs: run scan, list findings, **latest scan (refresh-safe)**
- Single AWS account + optional **1 extra account**
- RBAC (admin/viewer)
- Health + metrics endpoints
- Email service (MailHog dev, SES prod)

## Frontend (≈4)
- Marketing landing page
- Login/signup flow
- Dashboard (findings table + severity chart)
- Mobile responsive layout
- Persist scan results on refresh
- Simple account switcher (if backend supports)
- First-time onboarding
- Email flows UX (welcome, reset, alerts) with MailHog testing

## Security (≈4)
- Top **10 IAM finding types**
- Severity scoring
- False-positive reduction + deduplication
- IAM relationships (user / group / role)
- OAuth + RBAC security review
- API Gateway auth, CORS, rate limiting, security headers
- OPA/Checkov/Gitleaks documentation and baseline
- Remediation content review (pairs with AI)

## DevOps (≈4)
- CI green
- PR checks + linting
- One deployable environment
- Terraform cleanup
- Health check + deployment verification
- Terraform apply on merge (infra deployment)
- Vite in Docker (Frontend onboarding)
- MailHog (local email testing)

## Data (≈4)
- Prometheus scraping backend metrics
- Grafana dashboards:
  - Findings over time
  - Severity distribution
- **PDF security summary export**
- **CSV export of findings**
- Minimal alerting

## AI (≈3) — v1: Safe Remediation Assistant
- Remediation suggestions per finding
- “Why this matters” explanation
- Confidence score (High / Medium / Low)
- Backend API
- Frontend widget

## PMO (3)
- Roadmap & sprint goals
- Dependency tracking
- Weekly demos
- Scope enforcement

---

# Issue Count Target (Semester)

**Target:** ~70 `(SEMESTER)` issues total  
(~3 per student with buffer)

---

# How to Create Issues (Fast)

1. Create milestones **P0, M1–M6** in GitHub.
2. Create labels:  
   `team: backend`, `team: frontend`, `team: security`, `team: devops`, `team: data`, `team: ai`, `team: pmo`, `team: foundation`
3. Create issues **only** from the **Quick Reference — (SEMESTER)** below.

---

# Quick Reference — (SEMESTER) Issues Only
> **Create GitHub Issues only from this list.**

### Foundation / PMO
| ID | Title | Team | Milestone |
|---|---|---|---|
| F1 | (SEMESTER) Fix CI pipeline (GitHub Actions) | DevOps | M1 |
| F2 | (SEMESTER) Fix Docker healthcheck | DevOps | M1 |
| F3 | (SEMESTER) Pin Prometheus/Grafana image versions | DevOps | M1 |
| F4 | (SEMESTER) Update TEAM_SETUP.md for GitHub Org | PMO | M1 |
| F5 | (SEMESTER) Update CONTRIBUTING.md for GitHub Org | PMO | M1 |
| F6 | (SEMESTER) Document who needs AWS credentials | PMO | M1 |
| P1 | (SEMESTER) Maintain 4-week roadmap + sprint goals | PMO | M1 |
| P2 | (SEMESTER) Define PR workflow + CODEOWNERS | PMO | M1 |
| P4 | (SEMESTER) Acceptance criteria for Landing + OAuth | PMO | M1 |
| P5 | (SEMESTER) Sprint retro + publish next-phase goals | PMO | M6 |

### Backend
| ID | Title | Milestone |
|---|---|---|
| B1 | (SEMESTER) Document AWS infra for OAuth + Cognito | M2 |
| B6 | (SEMESTER) Add Cognito User Pool via Terraform | M2 |
| B7 | (SEMESTER) Implement OAuth login flow (Hosted UI) | M2 |
| B10 | (SEMESTER) Secure APIs with JWT validation | M2 |
| B17 | (SEMESTER) Backend health endpoint (/health) | M3 |
| B13 | (SEMESTER) Normalize scans to unified findings schema | M4 |
| B14b | (SEMESTER) API: latest scan results (refresh-safe) | M4 |
| B18 | (SEMESTER) Metrics endpoint for Prometheus | M4 |
| B19 | (SEMESTER) Configure email service (MailHog for dev, SES for prod) | M4 |
| B2 | (SEMESTER) Design multi-account *lite* (2 accounts max) | M5 |
| B4 | (SEMESTER) Cross-account role assumption | M5 |
| B11 | (SEMESTER) Multi-account scanning (*lite*) | M5 |
| B12 | (SEMESTER) Account registration & lifecycle APIs | M5 |
| B9 | (SEMESTER) RBAC (admin/viewer) | M5 |

### Frontend
| ID | Title | Milestone |
|---|---|---|
| W1 | (SEMESTER) Marketing landing page | M3 |
| W2 | (SEMESTER) OAuth login/signup page | M3 |
| W3 | (SEMESTER) Auth redirects + session persistence | M3 |
| W8 | (SEMESTER) Improve findings visualization | M4 |
| W9 | (SEMESTER) Filters/search/pagination | M4 |
| W10 | (SEMESTER) Empty-state UX | M4 |
| W10b | (SEMESTER) Persist scan results on refresh | M4 |
| W11 | (SEMESTER) Mobile responsiveness | M4 |
| W5 | (SEMESTER) Account connection status UI | M5 |
| W7 | (SEMESTER) Simple account switcher | M5 |
| W4 | (SEMESTER) First-time onboarding | M5 |
| W12 | (SEMESTER) Use MailHog for local email flows (welcome, reset password, alerts) | M4 |

### Security
| ID | Title | Milestone |
|---|---|---|
| S1 | (SEMESTER) Audit false positives | M4 |
| S2 | (SEMESTER) Tune IAM detection rules | M4 |
| S3 | (SEMESTER) Severity scoring | M4 |
| S5 | (SEMESTER) Deduplicate/suppress noise | M4 |
| S15 | (SEMESTER) Review OAuth/Cognito config | M3 |
| S16 | (SEMESTER) Validate backend authz enforcement | M5 |
| S17 | (SEMESTER) API Gateway auth (Cognito JWT or API key) | M5 |
| S18 | (SEMESTER) Document OPA/Rego policies | M4 |
| S19 | (SEMESTER) Document Checkov skip rationale | M4 |
| S20 | (SEMESTER) Gitleaks baseline & allowlist | M3 |
| S21 | (SEMESTER) IAM least-privilege audit (Lambda, GitHub Actions) | M5 |
| S22 | (SEMESTER) Security headers on API responses | M4 |
| S23 | (SEMESTER) Rate limiting on API Gateway | M5 |
| S24 | (SEMESTER) Audit logging for sensitive actions | M5 |
| S25 | (SEMESTER) CORS configuration review | M3 |
| S26 | (SEMESTER) Remediation content security review (pairs with AI) | M4 |
| S27 | (SEMESTER) Dependency vulnerability scanning in CI | M1 |

### Data & Reporting (Expanded)
| ID | Title | Milestone |
|---|---|---|
| A6 | (SEMESTER) Prometheus scrape backend metrics | M4 |
| A7 | (SEMESTER) Configure Grafana datasources | M4 |
| A8 | (SEMESTER) Grafana: findings over time | M4 |
| A9 | (SEMESTER) Grafana: severity distribution | M4 |
| A12 | (SEMESTER) Generate PDF security summary | M6 |
| A13 | (SEMESTER) Auditor-friendly PDF layout | M6 |
| A14 | (SEMESTER) CSV export of findings | M6 |
| A15 | (SEMESTER) Document reports & audiences | M6 |

### DevOps
| ID | Title | Milestone |
|---|---|---|
| D8 | (SEMESTER) Lint/format gates in CI | M6 |
| D12 | (SEMESTER) Optimize Docker images | M6 |
| D13 | (SEMESTER) Deployment verification (/health) | M6 |
| D14 | (SEMESTER) Add CI/CD workflow to apply Terraform on merge (infra deployment) | M1 |
| D15 | (SEMESTER) Add Vite service to Docker for simpler Frontend onboarding | M1 |
| D16 | (SEMESTER) Add MailHog for local email testing (welcome, reset password, alerts) | M4 |

### AI (v1 only)
| ID | Title | Milestone |
|---|---|---|
| AI-1 | (SEMESTER) AI v1 use cases (remediation only) | M6 |
| AI-2 | (SEMESTER) AI input schema (finding → context) | M6 |
| AI-3 | (SEMESTER) AI guardrails & safety rules | M6 |
| AI-4 | (SEMESTER) Decide AI runtime (async preferred) | M6 |
| AI-5 | (SEMESTER) Generate remediation suggestions (top 10) | M6 |
| AI-6 | (SEMESTER) Confidence scoring (H/M/L) | M6 |
| AI-7 | (SEMESTER) Backend API for recommendations | M6 |
| AI-8 | (SEMESTER) Frontend widget for recommendations | M6 |

---

# Post-Semester Parking Lot (POST — Do NOT Create Issues)

- AWS Organizations ingestion
- Compliance frameworks (CIS/NIST)
- Auto-remediation
- Multi-agent AI
- Data warehouse / ETL
- Multi-environment CI/CD
- Advanced caching or full API versioning

---

## Milestones (Good Flow Order — Reference)

> **Important:**  
> Only **P0 + M1–M6** are **active this semester**.  
> **M7–M10 are reference / post-semester milestones** and should not be used to create issues unless explicitly labeled `(SEMESTER)`.

This table shows the *ideal long-term flow* of the project and explains why milestones are ordered the way they are.

| Milestone | Name | Issues | Goal |
|---|---|---|---|
| **M1** | Foundation & process | F1–F6, P1, P2, P4, S27, D14, D15 | CI green, docs updated, clear “done” criteria |
| **M2** | Auth spine (backend) | B1, B6, B7, B10 | Cognito exists; OAuth + JWT working |
| **M3** | Auth + landing (frontend) | W1, W2, W3, S15, S20, S25 | Landing page + login/session end-to-end |
| **M4** | Single-account quality | S1–S3, S5, S18, S19, S22, S26, B13, B14b, B17, B18, B19, A8, A9, W8–W11, W10b, W12, D16 | Trusted findings, unified schema, better UX, refresh persistence, starter dashboards |
| **M5** | Multi-account backend | B2, B4, B8, B11, B12, S16, S17, S21, S23, S24 | Cross-account ingestion + account APIs (lite) |
| **M6** | Multi-account frontend | W5, W6, W7 | Account status, switcher, multi-account UI |
| **M7** | RBAC & security review *(POST)* | B9, S15, S16, W4 | RBAC enforced, auth security reviewed, onboarding |
| **M8** | Data & reporting *(POST)* | A1–A7, A10–A15 | Metrics pipelines, Grafana, exports, docs |
| **M9** | DevOps & ops polish *(POST)* | D1–D14, P3, P5 | CI/CD maturity, envs, rollback, documentation |
| **M10** | AI & intelligence *(POST)* | I1–I17 | Guarded remediation, compliance mapping, UI integration |

---

## Issue Count Summary (Full Backlog — Reference)

> **Note:**  
> This is the **entire backlog**, including post-semester work.  
> **This semester:** we will only create and work issues labeled `(SEMESTER)` (≈85 total).

| Department | # of issues |
|---|---:|
| Foundation | 6 |
| PMO | 5 |
| Backend | 20 |
| Frontend | 19 |
| Security | 18 |
| DevOps | 14 |
| Data | 15 |
| AI | 17 |
| **Total** | **114** |

Only `(SEMESTER)` issues count toward Spring delivery.
