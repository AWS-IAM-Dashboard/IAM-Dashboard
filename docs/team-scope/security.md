Security Team Scope Plan

Team Members: Dev, Jade, Sebas, Tibo

Week 1 February 17 – February 23
- Created and finalized Security Team scope & ownership document.
- Defined responsibilities, sprint breakdown, and Definition of Done.
- Reviewed repository structure and CI pipeline.
- Implemented dependency vulnerability scanning in CI (S27).
- Configured blocking rules for high and critical vulnerabilities.
- Documented vulnerability suppression process and severity policy.

Dev integrated dependency scanning into CI.
Jade reviewed severity thresholds and blocking logic.
Sebas validated pipeline behavior on failing builds.
Tibo documented scanning configuration and enforcement rules.


Week 2 February 24 – March 2
- Implement secret scanning enforcement (Gitleaks).
- Establish allowlist and false positive handling process.
- Review CORS configuration for restricted origins.
- Validate OAuth redirect URI configuration.

Dev will configure secret scanning enforcement.
Jade will validate OAuth login and redirect flows.
Sebas will tune allowlist and suppression rules.
Tibo will document CORS and authentication findings.


Week 3 March 3 – March 9
- Validate RBAC authorization enforcement.
- Test cross-account access restrictions.
- Ensure protected routes reject unauthorized access.
- Verify JWT validation in API Gateway.

Dev will test RBAC enforcement paths.
Jade will validate JWT handling and token expiry.
Sebas will review IAM policy attachments for over-permissioning.
Tibo will document findings and recommended fixes.

Week 4 March 10 – March 16
- Reduce false positives in scanner output.
- Define severity classification model (Critical, High, Medium, Low).
- Review Checkov skip justifications.
- Validate HTTP security headers on API responses.

Dev will define severity scoring model.
Jade will review remediation guidance clarity.
Sebas will tune scanner rules and deduplication logic.
Tibo will validate and document API security headers.

Week 5 March 17 – March 23
- Conduct IAM least-privilege audit (Lambda + GitHub Actions OIDC).
- Compare IAM policies against actual usage.
- Recommend or apply permission reductions.
- Document least-privilege changes.

Dev will audit Lambda execution role.
Jade will review GitHub Actions OIDC role.
Sebas will test reduced permissions in staging.
Tibo will document before/after IAM comparisons.

Week 6 March 24 – March 30
- Configure API Gateway rate limiting.
- Define request limits (per second and per day).
- Test throttling behavior.
- Document scaling considerations.

Dev will configure API Gateway usage plans.
Jade will test throttling edge cases.
Sebas will monitor logs during load testing.
Tibo will document rate limiting configuration.

Week 7 March 31 – April 6
- Implement audit logging for sensitive actions:
  - Login / logout
  - Account connection
  - Scan trigger
  - Role changes
- Define log schema and retention policy (CloudWatch).
- Verify logs are queryable.

Dev will implement backend logging hooks.
Jade will validate event completeness.
Sebas will configure CloudWatch retention policies.
Tibo will document audit schema and sample queries.

Definition of Done – Security
A task is complete when:

- Authorization is enforced and tested.
- IAM roles follow least privilege.
- Secrets and dependencies are scanned in CI.
- API endpoints are protected and rate limited.
- Sensitive actions are logged.
- Documentation is updated.
- No unreviewed critical risks remain.
