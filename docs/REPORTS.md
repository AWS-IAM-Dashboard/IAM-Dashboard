# Reports and audiences

This document describes the reporting surfaces in IAM Dashboard: **browser PDF (print-to-PDF)**, **CSV / JSON exports**, **Grafana dashboards**, who each output is for, and how to generate or narrow results.

For local URLs and stack layout, see the root [README.md](../README.md) and [onboarding/TEAM_SETUP.md](onboarding/TEAM_SETUP.md).

## Where to work in the UI

1. Sign in to the dashboard (local frontend is typically [http://localhost:3001](http://localhost:3001) when using Docker; see README).
2. Open **Reports** from the sidebar (Security Reports).

The Reports page has three main areas:

| Area | Purpose |
|------|---------|
| **Quick generate** | One-click presets (Security Summary, Threat Intelligence, Executive Brief, Audit Package, IAM & Access, Compliance Status). |
| **Advanced Report Builder** | Pick a scanner, optional custom title, and toggles for **pdf** / **csv** / **json**. |
| **Report history** | Table of past reports with a text filter; actions re-open the printable report when scan data is available. |

**Scheduled Reports** is a placeholder in the UI (cadence/email is not implemented yet).

---

## Audiences and recommended artifacts

| Audience | Primary artifact | Why |
|----------|------------------|-----|
| **Management / executives** | **Executive Brief** (PDF via print) | High-level severity counts, derived compliance-style score, and a small set of top critical items—suited for briefings. |
| **Security / IAM analysts** | **CSV** (and **JSON** for pipelines) | Tabular or machine-readable findings for spreadsheets, SIEM, or custom analysis. |
| **Operations / platform** | **Grafana** (and Prometheus) | Infra and app health, request rates, latency, and dashboarded metrics over time—not the same as the in-app PDF/CSV builder. |
| **Compliance / audit** | **Audit Package** (PDF + CSV + JSON) | Single action that bundles evidence; PDF is suitable for human review when saved from the browser print dialog. |

---

## PDF reports (summary and narrative)

### How PDFs are produced

The app does **not** push a finished `.pdf` file to your downloads folder. It opens a **new browser tab** with a formatted HTML report. You then use the browser’s **Print** dialog (**⌘P** / **Ctrl+P**) and choose **Save as PDF** (wording varies by browser).

- **Allow pop-ups** for the dashboard site; otherwise generation fails with a popup-blocker style error.
- For archival or auditors, save the PDF with a clear filename and note the scan date shown in the report header.

### What a PDF contains

Typical sections include:

- **Header metadata:** Report title, region, scan status, timestamp.
- **Severity summary:** Counts for Critical / High / Medium / Low (and derived totals where applicable).
- **Findings:** Grouped by severity, with resource and description fields as returned from scans.
- **Resource summary** (when scan summaries include IAM aggregates): users, roles, policies, groups.
- **Template-specific blocks** for certain report types, for example a compliance-style overview for executive-style reports and a threat-analysis block for threat-intelligence style reports.

Exact layout is generated in the frontend from the active scan payload.

### Quick presets (built-in filters)

| Preset | Output | Data scope / filter |
|--------|--------|---------------------|
| **Security Summary** | PDF | Combined view across available scans; all findings contributing to a single summary. |
| **Threat Intelligence** | PDF | **Critical and High** severities only. |
| **Executive Brief** | PDF | Aggregated severities, a **compliance-style score** derived from counts, and a short list of critical findings. |
| **Audit Package** | PDF + CSV + JSON | Same combined dataset as a full hand-off bundle (see CSV/JSON below). |
| **IAM & Access** | PDF | Prefers the **IAM** scan when present; otherwise combined data filtered to IAM-like finding types. |
| **Compliance Status** | PDF | Combined scans framed as a compliance-oriented report. |

If no scans have been run, quick actions warn that there is **no scan data**—run scanners first.

### Customizing PDFs (Advanced Report Builder)

1. Expand **Advanced Report Builder**.
2. Choose the **scanner / source** (for example IAM, EC2, S3, Security Hub, GuardDuty, Config, Inspector, Macie, Alerts).
3. Optionally set a **custom report name** (used as the document title).
4. Ensure **pdf** is selected among the format toggles.
5. Click **Generate Report**.

**Data selection logic:** The builder prefers the **latest result for that scanner** when it exists. If not, it may fall back to **combined** scan results. If nothing is available, it can generate **empty or placeholder** output and show a warning—run the relevant scan first for real evidence.

---

## CSV export

### How to generate CSV

- **Advanced Report Builder:** enable **csv**, then **Generate Report**.
- **Audit Package** quick card: downloads CSV (and JSON) together with opening the PDF view.

### What CSV contains

Columns (in order):

`Severity`, `Type`, `Resource Name`, `Resource ARN`, `Description`, `Recommendation`

Commas inside description or recommendation text are replaced with **`;`** so the file stays valid CSV.

### Limits and filtering

- CSV export **requires at least one finding**. If there are no findings, export **fails** with a “no findings” style error—this is expected when scans are clean or not yet run.
- Scope follows the same scanner / fallback rules as the Advanced Report Builder (see PDF section). There is no separate “CSV-only” filter beyond choosing the scanner and running scans that produce findings.

### IAM findings CSV (separate from Reports)

The **AWS IAM Scan** experience includes its own **export to CSV** path (for example `iam-findings.csv`) with columns tailored to IAM findings (`ID`, `Resource`, `ARN`, `Type`, `Severity`, etc.). Analysts should use **Reports → CSV** for cross-scanner bundles and the **IAM scan page** when they only need IAM-tabular export.

---

## JSON export

JSON is available from the **Advanced Report Builder** (toggle **json**) and from **Audit Package**. It contains the structured scan payload used for the report (suitable for tools, replay, or auditor-requested machine-readable evidence).

---

## Report history

When report history rows exist, you can **filter** the table by name or type. The **View** / **Download** actions attempt to re-open a printable report using the **full** scan result when that data is present; if scan data is missing, the UI shows a warning.

---

## Grafana dashboards

### Who it is for

**Operations, SRE, and data teams** use Grafana to monitor **infrastructure and application metrics** (for example container health, request rates, latency) via **Prometheus**, alongside dashboard folders described in repository provisioning. This complements the **findings-focused** PDF/CSV exports from the Reports page.

### How to access (local development)

With the default Docker stack (see README):

- **Grafana:** [http://localhost:3000](http://localhost:3000) (default credentials are often `admin` / `admin`—change for any shared or production-like environment).
- **Prometheus:** [http://localhost:9090](http://localhost:9090)

Provisioning lives under `config/grafana/provisioning/`; dashboard JSON under `config/grafana/dashboards/`.

### Customizing Grafana views

Use Grafana’s UI: time range, variables, panel edits, and folder organization. The in-app **Grafana Integration** screen documents how operators can connect external Grafana instances (for example JSON API datasource patterns) to security-oriented metrics; backend routes under `/grafana` support integration scenarios described in code.

For access governance (for example data leads using Grafana without AWS console access), see [AWS_ACCESS.md](AWS_ACCESS.md).

---

## Prerequisites checklist

1. **Run scans** so the dashboard has results for the accounts and services you care about.
2. For **PDF:** allow **pop-ups**; use print-to-PDF from the new tab.
3. For **CSV:** ensure findings exist for the chosen scope.
4. For **Grafana:** stack running and correct URL; use Grafana’s own auth in real deployments.

---

## Related documentation

- [README.md](../README.md) — Ports, Docker, Grafana/Prometheus overview.
- [onboarding/TEAM_SETUP.md](onboarding/TEAM_SETUP.md) — Local service URLs for the team.
- [AWS_ACCESS.md](AWS_ACCESS.md) — Who accesses Grafana vs AWS console.
- [data/frontend-telemetry-spec.md](data/frontend-telemetry-spec.md) — Telemetry contract for metrics/Grafana-oriented work.
