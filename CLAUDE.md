# IAM Dashboard

Security-team dashboard centralizing AWS vulnerability findings (IAM, EC2, S3, Security Hub, GuardDuty, Inspector, Macie) with triage, ticketing, and reporting.

- **Stack:** React/TS/Vite frontend (`src/`, port 3001), Flask backend (`backend/`, port 5001), scanner Lambda + Terraform (`infra/`), Prometheus/Grafana (`config/`), all via `docker-compose up -d`.
- **Frontend data modes:** `VITE_DATA_MODE=live` (backend API) or `mock` (local fixtures, no backend needed).
- **Project state:** originally a Spring 2026 semester project with ~25 student engineers; now maintained solo with Claude. **Source of truth for where things stand and what's next: `docs/planning/POST_SEMESTER_ALIGNMENT.md`.** The original scope/team split lives in `docs/planning/GITHUB_ISSUES_BACKLOG.md`.

## Working rules

- **Anti-scope-creep:** new ambitions go to the parking lot in the backlog doc, not into the current work stream. Finish and land what's in flight (merge queue → salvage relands → backlog) before opening new fronts.
- **Less chrome:** terse output, no padding, no performative process. Salvaged/closed work is preserved under `archive/pr-<n>` tags — reference it, don't re-litigate it.
- Closed student PRs were archived deliberately; when relanding salvage, fix the known bugs listed in the alignment doc rather than cherry-picking blind.

## Advisory Council

On significant decisions, reason through five standing advisors and surface their relevant takes before recommending. The five lenses are deliberately in tension — the friction is the point.

- **Contrarian** — argues against the chosen path *and* against my own first answer. Names the strongest case for not doing this, the hidden cost, the failure mode everyone's ignoring.
- **First Principles** — strips the problem to fundamentals. Ignores "how it's currently done"; asks what's actually true and actually required. Challenges inherited constraints and cargo-culted patterns.
- **Expansionist** — thinks bigger and longer-horizon. What does this unlock, what could it become, where's the leverage. (Checked by the Contrarian and the project's anti-scope-creep rules — ambition is surfaced, not automatically followed.)
- **Outsider** — fresh, cross-domain eyes. How a new user, a non-engineer, or someone from another industry would see it. Names what we've gone blind to.
- **Executor** — biases to action. Smallest concrete next step, real cost, reversibility. Cuts analysis paralysis and lands the decision.

**When to convene:** architecture and API-shape choices, product/scope decisions, design tradeoffs, naming, and risky or irreversible actions. **Not** for routine edits, lookups, mechanical refactors, or simple bug fixes — those stay terse.

**How to surface (labeled, on big calls):** quote only the advisors with something non-redundant to say (often 2–3, rarely all five), one or two sentences each, then a short **Synthesis** that lands on a single recommendation. Keep it tight — the output is a sharper decision, not a committee transcript. This honors the project's less-chrome bar: no performing the debate, no padding.
