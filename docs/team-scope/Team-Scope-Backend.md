# P0 - #148 Backend Team Scope & Ownership - IAM Dashboard (Spring 2026)

**Team:** Backend (B)

**Members:** 4 

**Timeline:** Feb 17- Apr 17, 2026

---


## Team Mission 

We're finally here! Ready to build a phenomenal security tool: The AWS Security IAM Dashboard. Here at the Backend team we're the engine thatmakes this whole system function.
Wear this as a badge of honor! 

We're here to set the tone and differentiate ourselves from the Cybersecurity pack! We will be creating a secure login, email alert system, and secure data reliability for AWS Security IAM Dashboard.

---

## Team Members & Roles
| Name | Role | Responsibilities |
|---|---|---|
| **Adrian A.** | Backend Technical Lead | Overall milestone pacing, organize team huddles, track scope and product precision, external lead collaboration, escalation, sign-off on scope/demo readiness. |
| **Alberto O.** | Backend Engineer | Provide Python and scripting support. Document current and developing scripts. |
| **Juan H.** | Backend Engineer | Provide backend support with script development and solution formaulation. Terraform, AWS SDK.|
| **Nathaniel H.** | Backend Engineer | Provide support with script development. Document current and developing scripts.| 

---

## Areas of Responsibility (Scope)
We're going to make sure that our users can register, authenticate securely, and redirect their logins to the application.

We will also enforce RBAC, configure an email alert service, develop a unified schema, exception handling for access violations, and much more.

---
**These are our domains:**
	
	Domain A: User identity management & secure authentication
	Domain B: Secure login, health check, and redirect to application 
	Domain C: Account registration, RBAC, account lifecycle management
	Domain D: Email alert system, Data refresh, schema management
	Domain E: Application data metrics delivery

---

## Out-of-Scope (Boundaries)

To maintain scope we will focus entirely on our Github Backend (B) issues B1-B19 according to the Milestone (M) schedule.

Our due dates are M2-M5. However we begin M1 and end on M6. Where we will brainstorm and troubleshoot respectively.

---
**These are the active Milestones:**
	
	Milestone 2: Authentication Backbone (AWS Cognito & JSON Web Tokens)
	Milestone 3: Landing the Login UX to the application
	Milestone 4: Configuring metrics endpoint, unified schema, data refresh, email services
	Milestone 5: Configure RBAC, account lifecycle, and exception handling

---

## Key Dependencies
**We will abide by the Contributing_MD for all our workflows, secure code, bugs, and features guidelines.**
| Depends On | Why |
|---|---|
|**Frontend Logic** | During the OAuth login and Landing UX development we will engage Frontend to guide unified schema.|
|**Metrics endpoint** | During development of /metrics endpoint we will engage Data and AI teams to ensure reliable data processing and data transfer. |
|**Dual email system** | Due to development & production isolation we will ensure scripts align with each environment and provide secure code review to ensure no dependencies contaminate each environment.|
|**Terraform CI/CD**| DevOps will impact how we deliver Terraform scripts D14.|
|MailHog| Local email testing must match SES objectives B19  & W12.|

---

## Risks
| Risk | Mitigation |
|---|---|
| Cost Limits | We will be cost aware for AWS services and actively engage PM team for awareness & decision making. |
|Feature limitations | We will communicate any technical limitations involving the implementation of expected feature delivery. |
|Secure authentication| We will work collaboratively to split B6, B7, & B10.|
|Inconsistent Schema| We will monitor schema and enforce a unififed schema. Ensure Data and Frontend align to schema.|
--- 

## End-of-Semester Demo Criteria (Definition of Success)
 **We are responsible for the following outcomes:** 
	
*Key backend goals*

	- Logging in with Cognito and smooth OAuth flow
	- Refresh data persistence
	- Metrics data delivery
	- Data reliability & unified schema
	- MailHog(dev) & SES(prod) email service

---

## Interview-Ready Outcomes
Collaborative backend design to deliver a secure login and authentication process with JWT validation and implement successful application redirection.


Created and configured an email alert system to provide emailed notifications of signifcant account registration events.

Provided site reliability and data schema management to deliver data to frontend UI and maintain session persistence during data and page refresh.

Created backend APIs to support account registration lifecycle and enforce RBAC for secure data delivery & site integrity.

Maintaining backend services and ensuring proper deployment to AWS Cognito, S3, and DynamoDB.

---

## Task Delegation
| Responsibility | Owner | Notes |
|---|---|---|
|Assign Tasks| Adrian A. | Responsible for Team outcomes, secure code review, AWS Cognito & RBAC integrations, and blocker mitigations|
|Backend Scripting| Juan H.| Responsible for formulating the Terraform scripts and API integrations|
|Backend Scripting| Alberto O. | Responsbile for formulating Python scripts to handle frontend logic and enforce schema. Document process, code dependencies, and objects.|
|Backend Scripting | Nathaniel H. | Responsbile for formulating Python scripts to handle backend response, enforce schema. Document process, code dependencies, and objects.

---

## Weekly Cadence
We will be meeting 3-4 times per week for 3-4 hour breakout sessions for collaboration and milestone execution.

---

## Contact & Escalation
- **WhatsApp:** Team group chat or DMs
- **Escalation:** Peer Engineer → Adrian (Technical Lead) → Elsa/Jewels (Project Manager) → Joaquin (Product Manager)
- **Technical issues:** Coordinate with team leads before picking up work

**Signature (Conceptual):**  
This scope was defined by the Backend team on [2/23/2026]. Work begins immediately after submission.
