Findings Visualization 
**Current dashboard UX gaps**
- Unclear empty state when no scans have been run 
- Legends and labels are not corresponding properly to the data
(All of the labels are the same thing)
- Layout/Spacing can be improved, and better cyber graphs can be used
(E.g.: network graphs, heatmaps, time-series charts, and Sankey diagrams)
- Legend can be for severity and compliance should be clearly defined
(Graphs should be tuned according to data: X and Y axis metrics)

**Step two: Check what data is available through 'ScanResultsContext'**
- Data I've seen includes: critical_findings, high_findings, medium_findings, low_findings, users, roles, policies, potential timestamps, and groups.
-> This data is also not being used to its full potential in the compliance dashboard.
- Seperate by policies, by groups, by roles, by users if they have been assigned to a policy, etc. (Ideas) #Show counts or labels for each of these
- 100% implementation of differentiating between low, medium, high and critical findings. 

**Deduplication + Suppression (implemented)**
- The dashboard now collapses duplicate findings across scanner sources (and suppresses low-value findings) before counts are computed.
- Deduplication and filtering are applied in `ScanResultsContext` and then repeated where combined totals are computed across multiple scans.
- Rules are config-driven in `src/config/findings-rules.json` via two controls:
  - `suppression`
    - Default behavior suppresses `low`, `informational`, and `info` severities.
    - Optional `fieldMatches` can be added to suppress findings by regex against `title`, `description`, `message`, or other finding fields.
  - `deduplication`
    - Identical findings are detected via “identity strategies” using a fingerprint of key fields (example strategies include `rule_id + resource_id`, `finding_type + resource_arn`, and `finding_type + title`).
    - When multiple findings share the same fingerprint, the dashboard keeps the highest-severity representative and tracks a small dedup count (`_dedup_count`).
- Shared logic lives in `src/utils/findingsDedup.ts`.
- To tune behavior without code edits, modify `src/config/findings-rules.json` and (if you need new identity fields) update the canonical field aliases in `src/utils/findingsDedup.ts`.

**Simple client-side filtering and sorters** (Front-end)
##Possible implentations:
- Filter by Severity #low, medium, high, critical (Better text and tooltips around these badges)
- Filter by Policy 
- Filter by Group (E.g.: Security, Compliance, DevOps, etc. or specific groups like 'IAM Admins', 'IAM Users', 'IAM Roles', 'IAM Policies', etc.) 
- Filter by Role
- Filter by User (e.g., 'User 1', 'User 2', 'User 3', etc. or whether they've been assigned to a policy, or if they've been assigned to a role, or if they've been assigned to a group, etc.)
- Filter by Timestamp
- Filter by Compliance Score
- Filter by Cost Savings
- Filter by Risk Score
- Clear legend around what the compliance score is,how it is calculated and what it means (according to target audience)
(showing counts or labels for each of these)
- Better no-findings state, and better empty state when no scans have been run
- Sort by Severity, Policy, Group, Role, User, Timestamp, Compliance Score, Cost Savings, Risk Score
- Sort by newest/oldest findings

**Step 4: Mock scenarios to drive the design**
- No findings state, and empty state when no scans have been run
- Clear legend around what the compliance score is,how it is calculated and what it means (according to target audience)
- Some critical/high/medium findings, if there are fewer, should be shown in the dashboard, and the compliance dashboard should be able to show them and filter by them.
