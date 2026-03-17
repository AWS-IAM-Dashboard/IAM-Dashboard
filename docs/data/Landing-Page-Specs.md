# Landing Page Chart Specs (A10)

Spec for charts to display on the IAM Dashboard landing page. Frontend (W1, W8) should use this as the reference for what to build.

---

## Legends, Values and Colors are all subject to change 

## 1. Findings Over Time


**Name** | Findings over time |
**Purpose** | Shows whether risks are increasing or decreasing over the selected period |
**Chart type** | Line chart |
**Data source** | Prometheus (mock for now) |
**Example query** | `sum by (severity) (increase(iam_findings_total[1h/6h]))` — refine when metrics endpoint exists |
**Time range** | Last 7 days or last 30 days (user-selectable) |
**Visual notes** | X-axis: time. Y-axis: count. One line/series per severity (Critical, High, Medium, Low). Colors: red = Critical, orange = High, yellow = Medium, blue = Low. Include legend. Axis titles: "Time" and "Findings count". I used a gradient for the line chart because it looked better. |


## 2. Severity Distribution

**Name** | Severity distribution |
 **Purpose** | Shows breakdown of findings by severity (Critical / High / Medium / Low) |
 **Chart type** | Pie chart or donut chart (I prefer donut chart, it looks more professional) |
 **Data source** | Prometheus (mock for now) |
 **Example query** | `sum(iam_findings_total) by (severity)` — refine later |
 **Time range** | Current state (no time range) or last scan | **Visual notes** | Colors: Critical = red (#E53935), High = orange (#FF9800), Medium = yellow (#FDD835), Low = blue (#1E88E5). Show labels on pie pieces with percentage, and add a legend to the bottom with names/color|

## 3. Latest Scan Status (Optional)


**Name** | Latest scan status |
**Purpose** | Quick at-a-glance: when was the last scan and did it pass or fail |
**Chart type** | Single stat |
**Data source** | Prometheus or API (mock for now) |
**Example query** | Last scan timestamp; pass/fail status. E.g. `last_scanned_timestamp`, `last_scan_status` |
**Time range** | N/A (current value only) |
**Visual notes** | Display text: "Last scanned X ago" (e.g. "2 hours ago"). Pass = green check; Fail = red X or nothing. Keep compact and small. |

---
## 3. Recent Alerts (Optional)


**Name** | Recent Alerts |
**Purpose** | Risks that just arrived in the queue, also can be changed for Most Critical risks to prioritize now |
**Chart type** | Alert List or Dashboard List |
**Data source** | Prometheus or API (mock for now) |
**Example query** | iam_alerts_total{status="active"} or i_am_recent_alerts - refine once the metrics endpoint exposes alert data |
**Time range** | Last 30m, maybe an hour |
**Visual notes** | Shows up when there's an alert that just occured, use severity colors e.g. red = critical. Keep panel small and readable so analysts can quickly identify urgent risks, etc. 3/4 max alerts at a time. |




