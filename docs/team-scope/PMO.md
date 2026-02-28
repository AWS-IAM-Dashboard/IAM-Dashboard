# PMO Team Scope — IAM Dashboard (Spring 2026)

**Team:** Project Management Office (PMO)  
**Members:** 3  
**Timeline:** Feb 17 – Apr 17, 2026 (9 weeks)

---

## Team Mission

Keep the project on pace, manage dependencies, enforce scope, and ensure smooth delivery of the Apr 17 demo.

---

## Team Members & Roles

| Name | Role | Responsibilities |
|---|---|---|
| **Joaquin** | PMO Lead | Overall project pacing, external stakeholder management, escalation, final sign-off on scope/demo readiness |
| **Elsa** | PM — Dependency & Demo Coordination | Track cross-team blockers, organize weekly demos, ensure features are demo-ready |
| **Jewels** | PM — Scope Enforcement & Documentation | Maintain backlog/roadmap, enforce semester scope, update docs, track progress/velocity |

**Note:** All 3 PMs can pick up technical issues during downtime by coordinating with team leads.

---

## In Scope (Semester)

### Core Responsibilities

1. **Project Pacing & Deadlines**
   - Track milestone progress (P0, M1–M6) and ensure Apr 17 demo readiness
   - Escalate risks and blockers to instructors or leads

2. **PR Management**
   - Monitor open PRs, ensure 2 required reviews (GitHub-enforced)
   - Nudge reviewers when PRs stall, verify PRs link issues and pass CI

3. **Dependency Tracking & Escalation**
   - Track cross-team blockers (e.g. Frontend blocked by Backend schema)
   - **Escalation SLA:**
     - **24 hours:** Escalate blocker to team leads or PMO Lead
     - **48 hours max:** Re-route issue or assign workaround if blocker unresolved

4. **Weekly Demos**
   - Organize and run weekly demos, ensure teams are prepared
   - Capture feedback and next steps

5. **Scope Enforcement**
   - Ensure teams only work on `(SEMESTER)` issues
   - Block `(POST)` work, protect delivery timeline

6. **Documentation Maintenance**
   - Keep `docs/planning/GITHUB_ISSUES_BACKLOG.md` up to date
   - Update milestone mappings and document decisions

7. **Progress Visibility & Velocity Tracking**
   - **Target velocity:** 9–11 issues closed per week (85 issues ÷ 9 weeks ≈ 9.4/week)
   - Track weekly issue closure rate by team and overall
   - Report weekly: "Week X: Y issues closed (Z% of target), A blockers escalated"
   - Identify teams ahead/behind, adjust workload or re-route issues

8. **Cross-Team Coordination**
   - Facilitate standups, async check-ins, or WhatsApp communication
   - Ensure teams know who owns what and when

9. **Technical Contribution (Downtime)**
   - Pick up issues from any team during light PM load
   - Coordinate with team leads before starting

---

## Out of Scope (Implied)

- Writing code for features owned by other teams (unless explicitly picking up an issue during downtime)
- Detailed technical design decisions (defer to team leads)
- Infrastructure provisioning or AWS account management (defer to DevOps/Infra)

---

## Key Dependencies

| Depends On | Why |
|---|---|
| **All teams** | PMO needs status updates and honest communication to track progress |
| **CI Green (F1)** | PRs can't be reviewed/merged if CI is broken |
| **GitHub org access** | All PMs need repo admin/triage access for PR management and issue triage |

---

## Risks & Assumptions

| Risk | Mitigation |
|---|---|
| **Teams don't report blockers early** | Weekly check-ins, async WhatsApp pings, dependency tracking |
| **PR reviews stall (missing 2nd reviewer)** | PMO nudges reviewers, escalates to leads |
| **Scope creep (teams work on `(POST)` issues)** | PMO reviews new issues, blocks out-of-scope work |
| **PMO lead unavailable (external club)** | Elsa and Jewels escalate and decide independently |
| **PMO becomes a bottleneck** | Clear delegation, PMs act independently |

**Assumptions:**
- Teams report progress and blockers honestly
- GitHub enforces 2-reviewer requirement
- Weekly demos happen consistently

---

## Definition of Done (Demo-Level)

PMO is "done" if:

1. **Apr 17 demo is successful** — all 7 demo criteria met, no major blockers
2. **All `(SEMESTER)` issues tracked** — created, assigned, closed; no out-of-scope work
3. **Dependency blockers resolved** — escalated within 24 hours, resolved or re-routed within 48 hours max
4. **Documentation up to date** — backlog, roadmap, onboarding reflect current state
5. **Weekly demos run** — at least 7 demos (P0 → M6), teams demoed working features
6. **Retrospective complete** — lessons learned captured, post-semester roadmap published

---

## Interview-Ready Outcomes

When describing PMO work in interviews, you can say:

- **"Managed an 85-issue backlog across 7 teams (Backend, Frontend, Security, DevOps, Data, AI, Foundation) for a 9-week sprint."**

- **"Tracked and escalated cross-team dependencies with 24-hour SLA, re-routing work within 48 hours if blockers persisted."**

- **"Organized and ran 7 weekly demos, keeping stakeholders aligned and teams accountable."**

- **"Enforced semester scope by blocking out-of-scope work and re-routing teams when priorities shifted."**

- **"Tracked velocity at 9.4 issues/week average across 9-week sprint, identifying bottlenecks and re-routing work to stay on pace."**

- **"Led a team of 3 PMs, delegating dependency tracking, demo coordination, and documentation maintenance."**

- **"Delivered a live demo on Apr 17 with 100% of semester goals met (auth, scan, findings, remediation, exports)."**

---

## Task Delegation

| Responsibility | Owner | Notes |
|---|---|---|
| **Overall project pacing** | Lead | Final escalation point, stakeholder communication |
| **External club management** | Lead | Not PMO work, but affects availability |
| **Cross-team dependency tracking** | Elsa | Maintains dependency matrix, escalates blockers |
| **Weekly demo organization** | Elsa | Schedules, coordinates, ensures teams are ready |
| **Scope enforcement (issue triage)** | Jewels | Reviews new issues, blocks `(POST)` work |
| **Backlog/roadmap maintenance** | Jewels | Updates `GITHUB_ISSUES_BACKLOG.md` as work shifts |
| **Progress tracking & velocity** | Jewels | Tracks completed issues, reports weekly status |
| **PR monitoring & nudging** | All 3 | Shared responsibility; rotate weekly or per-team |
| **Standups / Slack coordination** | Lead + Elsa | Lead sets tone, Elsa facilitates day-to-day |
| **Technical issue pickup (downtime)** | All 3 | Coordinate with team leads before starting work |
| **End-of-semester retro (P5)** | Lead + Elsa + Jewels | Co-facilitate, document lessons learned |

---

## Weekly Cadence (Example)

- **Monday:** Check milestone progress, review open PRs, ping stalled reviewers
- **Tuesday:** Dependency check-in (WhatsApp or standup), escalate blockers
- **Wednesday:** Demo prep (Elsa confirms what each team will demo)
- **Thursday:** Weekly demo (Elsa runs, all 3 attend)
- **Friday:** Backlog review (Jewels updates docs), **velocity report (X issues closed this week, Y% of 9.4/week target)**, plan next week

---

## Contact & Escalation

- **WhatsApp:** Team group chat or DMs
- **Escalation:** Elsa/Jewels → Lead → Instructor/TA
- **Technical issues:** Coordinate with team leads before picking up work

---

**Signature (Conceptual):**  
This scope was defined by the PMO team on [Date]. Work begins immediately after submission.
