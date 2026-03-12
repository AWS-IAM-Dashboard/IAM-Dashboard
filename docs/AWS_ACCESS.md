## Access Model: Team Leads Only

To simulate real enterprise practices, **only team leads get AWS console access**. This mirrors how actual companies operate, where senior engineers have production access and junior developers work through CI/CD or team leads.

### Who Gets AWS Access

| Role | Access | Why |
|------|--------|-----|
| **DevOps Lead** | ✅ Full console + CLI | Infrastructure management, Terraform, debugging |
| **Backend Lead** | ✅ Service-specific console + CLI | Deploy services, manage Cognito/Lambda/API Gateway |
| **Security Lead** | ✅ Read-mostly console + CLI | Run IAM scans, audit configurations |
| **Data Lead** | ✅ Read-only console + CLI | CloudWatch metrics, configure Prometheus |

**Total: 4-5 AWS users**

### How Team Members Without Access Work

**DevOps Team:**
- Write Terraform locally
- Test with `terraform plan`
- Deploy via CI/CD (D14) or pair with lead
- Review infrastructure changes in PRs

**Backend Team:**
- Develop APIs locally
- Run tests locally (Pair with team lead to run in AWS)
- Deploy via CI/CD or lead deploys manually
- Pair programming for complex deployments

**Security Team:**
- Write detection rules and tests
- Use mock AWS data for development
- Lead runs actual scans against AWS
- Review findings through APIs/dashboards

**Data Team:**
- Access Grafana directly (no AWS credentials needed)
- Pull data through Backend APIs
- Build dashboards and reports
- Lead configures CloudWatch/Prometheus

### If Team Members Need Temporary Access

In rare cases, a team member may need temporary AWS access:

1. Open GitHub issue: "Temporary AWS Access Request - [Name] - [Reason]"
2. PMO + Team Lead approve
3. DevOps Lead grants 24-48 hour access
4. Access automatically revoked after period
5. Document what was done

**This should be exception, not rule.**
