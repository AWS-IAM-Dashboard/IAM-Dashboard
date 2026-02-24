# Data Team Scope

## Team: Data  
Team Lead: Alexa Jimenez  
Members: Zoili Paladino, Stacy Albert, Fareeha Gullany
Team Meetings: Fridays @ 5:00 PM

--------------------------------------------------------------------

## Mission

The Data Team owns all data aggregation, dashboards, alerting logic, and reporting for IAM-Dashboard.

We are responsible for transforming IAM findings into measurable insights, visual dashboards, and exportable reports.

--------------------------------------------------------------------

# Week 1–2: Observability Setup

### Issues
- A6 — Prometheus scrape backend metrics (#129)  
- A7 — Configure Grafana datasources (#130)  

### Ownership

**Zoili**
- Implement A6 — Prometheus scrape backend metrics

**Stacy**
- Validate metric accuracy and coverage

**Fareeha**
- Implement A7 — Configure Grafana datasources  
- Document datasource configuration

**Alexa**
- Coordinate backend alignment  
- Review and merge PRs  

**Deliverable**
- Backend metrics successfully scraped
- Grafana connected to backend metrics

--------------------------------------------------------------------

# Week 3–4: Core Visualizations

### Issues
- A8 — Findings over time (#131)  
- A9 — Grafana: severity distribution (#132)  

### Ownership

**Zoili**
- Implement A8 — Findings over time aggregation logic

**Stacy**
- Validate severity classification logic

**Fareeha**
- Implement A9 — Grafana: severity distribution dashboard

**Alexa**
- Validate dashboard accuracy with real data

**Deliverable**
- Functional Findings over time visualization
- Functional Grafana: severity distribution dashboard

--------------------------------------------------------------------

# Week 5–6: Reporting & Exports

### Issues
- A12 — PDF summary (#133)  
- A13 — Auditor-friendly PDF layout (#134)  
- A14 — CSV export of findings (#135)  
- A15 — Document reports & audiences (#136)  

### Ownership

**Zoili**
- Implement A14 — CSV export of findings

**Stacy**
- Define required data fields for audit reporting

**Fareeha**
- Implement A12 — PDF summary  
- Design A13 — Auditor-friendly PDF layout  
- Complete A15 — Document reports & audiences  

**Alexa**
- Review export usability  
- Validate documentation completeness  

**Deliverable**
- Working CSV export
- Auditor-friendly PDF summary
- Completed documentation for reports & audiences

--------------------------------------------------------------------

# Week 7–8: Advanced Dashboards

### Issues
- A11 — Scanner performance dashboard (#194)  
- A16 — Multi-account metrics view (#195)  

### Ownership

**Zoili**
- Implement backend aggregation for A16 — Multi-account metrics view

**Stacy**
- Define performance indicators for A11 — Scanner performance dashboard

**Fareeha**
- Build dashboard visualizations for A11 — Scanner performance dashboard

**Alexa**
- Conduct integration testing  
- Coordinate cross-team validation  

**Deliverable**
- Functional Multi-account metrics view
- Functional Scanner performance dashboard

--------------------------------------------------------------------

# Week 9–10: Alerting & Governance

### Issues
- A10 — Alerting rules (critical findings threshold) (#193)  
- A17 — Data retention policy (#196)  

### Ownership

**Zoili**
- Implement A10 — Alerting rules (critical findings threshold)

**Stacy**
- Define critical findings thresholds  
- Draft A17 — Data retention policy requirements  

**Fareeha**
- Document alert configuration  
- Finalize A17 — Data retention policy documentation  

**Alexa**
- Validate alert behavior  
- Ensure policy alignment across teams  

**Deliverable**
- Functional Alerting rules (critical findings threshold)
- Completed Data retention policy

--------------------------------------------------------------------

# Week 11–12: Final Validation & Demo

### Issues
- Team Scope & Ownership - Data & Reporting (#152)  

### Ownership

**Alexa**
- Final demo preparation  
- Validate Definition of Done for all issues  

**Zoili**
- Final performance validation  

**Stacy**
- Final dashboard and alert validation  

**Fareeha**
- Final documentation polish  

**Deliverable**
- All Data team issues demo-ready  
- Documentation complete  

--------------------------------------------------------------------

# Definition of Done

An issue is complete when:

- Implementation matches issue requirements  
- Data renders correctly using real backend input  
- Exports generate usable files  
- Alert logic behaves as expected  
- Documentation exists  
- Feature can be demonstrated live  

--------------------------------------------------------------------

# Outcomes

By semester end, the Data Team will have:

- Implemented backend observability using Prometheus  
- Built Grafana dashboards visualizing IAM trends and severity distribution  
- Delivered exportable, auditor-ready reporting capabilities  
- Implemented configurable alert thresholds for critical IAM findings  
- Defined and documented a data retention policy  
- Collaborated cross-functionally with Backend, Frontend, and DevOps teams  
