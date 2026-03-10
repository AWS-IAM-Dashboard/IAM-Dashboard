# Landing Page Chart Specs (A10)

Spec for charts to display on the IAM Dashboard landing page. Frontend (W1, W8) should use this as the reference for what to build.

---

## 1. Findings Over Time

| Field | Value |
|-------|-------|
| **Name** | Findings over time |
| **Purpose** | Shows whether risks are going up or down over the selected period |
| **Chart type** | Line chart or area chart |
| **Data source** | Prometheus (or mock for now) |
| **Example query** | `sum(iam_findings_total) by (severity)` — refine when metrics endpoint exists |
| **Time range** | Last 7 days or last 30 days (user-selectable) |
| **Visual notes** | X-axis: time. Y-axis: count. One line/series per severity (Critical, High, Medium, Low). Colors: red = Critical, orange = High, yellow = Medium, blue = Low. Include legend. Axis titles: "Time" and "Findings count". |

### Screenshot

1. Open Grafana at http://localhost:3000/ and go to **Dashboards > Landing Page Spec**
2. For the "Findings over time" panel: click panel title > **Share** > **Copy panel image**
3. Save screenshot and add below (or link to `docs/planning/screenshots/findings-over-time.png`)

*[Screenshot placeholder: add `findings-over-time.png`]*

---

## 2. Severity Distribution

| Field | Value |
|-------|-------|
| **Name** | Severity distribution |
| **Purpose** | Shows breakdown of findings by severity (Critical / High / Medium / Low) |
| **Chart type** | Pie chart or donut chart (or horizontal bar) |
| **Data source** | Prometheus (or mock for now) |
| **Example query** | `sum(iam_findings_total) by (severity)` — refine later |
| **Time range** | Current state (no time range) or last scan |
| **Visual notes** | Colors: Critical = red (#E53935), High = orange (#FF9800), Medium = yellow (#FDD835), Low = blue (#1E88E5). Show labels with count and percentage. Legend at bottom or side. |

### Screenshot

1. In Grafana "Landing Page Spec" dashboard, open the "Severity distribution" panel
2. Click panel title > **Share** > **Copy panel image** (or take a screenshot)
3. Save as `docs/planning/screenshots/severity-distribution.png`

*[Screenshot placeholder: add `severity-distribution.png`]*

---

## 3. Latest Scan Status (Optional)

| Field | Value |
|-------|-------|
| **Name** | Latest scan status |
| **Purpose** | Quick at-a-glance: when was the last scan and did it pass or fail |
| **Chart type** | Single stat |
| **Data source** | Prometheus or API (or mock for now) |
| **Example query** | Last scan timestamp; pass/fail status. E.g. `last_scanned_timestamp`, `last_scan_status` |
| **Time range** | N/A (current value only) |
| **Visual notes** | Display text: "Last scanned X ago" (e.g. "2 hours ago"). Pass = green check; Fail = red X. Keep compact. |

### Screenshot

1. In Grafana "Landing Page Spec" dashboard, open the "Latest scan status" panel
2. Click panel title > **Share** > **Copy panel image** (or take a screenshot)
3. Save as `docs/planning/screenshots/latest-scan-status.png`

*[Screenshot placeholder: add `latest-scan-status.png`]*

---

## Alignment and Handoff (Step 5)

1. **Share the doc and screenshots** with the Frontend team (W1, W8) and PMO
2. **Frontend (W1, W8)**: Use this spec and screenshots to implement charts in React (Recharts). Wire real data from backend API when available.
3. **PMO**: Confirm these are the landing-page charts; update this doc if scope changes.
4. **Grafana dashboard**: The "Landing Page Spec" dashboard is provisioned from `config/grafana/dashboards/landing-page-spec.json`. Start services with `docker compose up -d`, then open http://localhost:3000/ — the dashboard loads automatically. Use TestData DB for dummy panels until Prometheus metrics (A6/B18) are available.
