---
name: IR Action Engine architecture
description: Two-lane IR engine added to FindingDetailPanel — LLM Copilot + AWS Automation lanes, approval workflow, forensics/evidence panel
type: project
---

IR Action Engine shipped in `ui-ux-cracked` branch.

**New files:**
- `src/types/ir.ts` — all types (IRActionType x11, IRActionStatus, ApprovalRequest, ForensicsCapture, EvidenceRecord, etc.)
- `src/mock/irMock.ts` — mock simulation: triggerMockAction / pollMockJob / approveMockAction / rejectMockAction + forensics/evidence fixtures
- `src/services/irEngine.ts` — API client for all 6 endpoints + pollUntilDone helper
- `src/components/ir/IRActionEngine.tsx` — two-lane UI (LLM Copilot / AWS Automation)
- `src/components/ir/EvidenceForensicsPanel.tsx` — forensics + evidence vault panel
- `backend/api/ir.py` — Flask resources for all IR endpoints
- `src/tests/ir.test.ts` — 29 tests (Vitest), all passing
- `vitest.config.ts` — Vitest configuration

**Modified:**
- `FindingDetailPanel.tsx` — added "IR Engine" + "Evidence" tabs (kept legacy "Agent Actions" tab)
- `src/mock/apiMock.ts` — added IR endpoint dispatch
- `backend/app.py` — registered 13 new IR routes
- `package.json` — added test/test:watch/test:ui scripts

**Architecture:**
- LLM lane: llm_triage, llm_root_cause, llm_runbook → POST /api/llm/*
- Containment (approval-gated): aws_ec2_isolate, aws_iam_revoke_key → POST /api/automation/contain
- Automation: aws_iam_disable_key, aws_ssm_runbook → POST /api/automation/remediate
- Forensics: aws_ebs_snapshot, aws_memory_dump, aws_athena_query → POST /api/forensics/capture
- Evidence: aws_evidence_vault → POST /api/evidence/preserve

**Approval workflow:**
- High-impact actions return status=pending_approval with ApprovalRequest
- Analyst sees approval gate in action card with impact + rollback procedure
- POST /api/ir/actions/{jobId}/approve → transitions to queued → polling continues
- Step Functions ARN in approval object (stub — real SFN integration ready to wire)

**Mock mode:**
- Time-based progression: queued (0s) → running (1.5s) → succeeded (4s)
- ~10% random failure rate for realism
- Approval stays pending until explicit approveMockAction() call

**Why:** Built as requested for IR Mode in Security Overview — separates copilot from deterministic AWS automation, enforces approval gates for destructive operations.
