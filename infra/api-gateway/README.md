# API Gateway for IAM Dashboard

## 🎯 What This Does

Creates an AWS API Gateway (HTTP API) resources for the 9 security scan endpoints and 3 authentication scan endpoints. 
They're also integrated with the two Lambda function that current exist.

## 📋 Existing API Endpoints

The following 12 endpoints have been implemented:

### Scanner Endpoints

1. `POST /scan/security-hub` - Trigger Security Hub scan
2. `POST /scan/guardduty` - Trigger GuardDuty scan
3. `POST /scan/config` - Trigger AWS Config scan
4. `POST /scan/inspector` - Trigger Inspector scan
5. `POST /scan/macie` - Trigger Macie scan
6. `POST /scan/iam` - Run IAM OPA policy scan
7. `POST /scan/ec2` - Run EC2 OPA policy scan
8. `POST /scan/s3` - Run S3 OPA policy scan
9. `POST /scan/full` - Run all scanners (full security scan)

### Authentication Endpoints

1. `POST /auth/login` - Trigger the login workflow to authenticate the user. Store the session cookie in backend and user's browser
2. `POST /auth/logout` - Sign the user out of the application. Remove the cookie from the backend and the user's browser
3. `GET /auth/session` - Use the stored cookie on the user's browser to authenticate automatically

## 📁 Files Created

- `infra/api-gateway/main.tf` - API Gateway REST API configuration
- `infra/api-gateway/variables.tf` - Input variables
- `infra/api-gateway/outputs.tf` - Output values
- `infra/api-gateway/README.md` - This file

## 🚀 How to Deploy

```bash
cd infra/api-gateway
terraform init
terraform plan
terraform apply
```
## 🔧 Current Configuration

- **API Name**: `iam-dashboard-api`
- **Protocol**: HTTP API (v2)
- **Stage**: `v1`
- **CORS**: Enabled with configurable origins
- **Throttling**: Per-route limits on the stage (see below)
- **Routes**: Added route definitions for 12 routes. 9 scanner, 3 authentication
- **Lambda Integration**: Integrated the scanner routes with the scanner lambda and auth routes with the auth lambda
- **Request/Response Mapping**: Configure request/response transformations
- **Deployment**: Deployed to stage and are currently live

## 📝 Example Route Integration

```hcl
# Example route for Security Hub scan
resource "aws_apigatewayv2_route" "scan_security_hub" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /scan/security-hub"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id           = aws_apigatewayv2_api.api.id
  integration_type = "AWS_PROXY"
  integration_uri  = var.lambda_function_arn
}
```

## 🔐 CORS Configuration

Default CORS settings:
- **Allowed Origins**: `[cors_allowed_origins]` (configure via variable)
- **Allowed Methods**: `["GET", "POST", "OPTIONS"]`
- **Allowed Headers**: `["Content-Type", "Authorization"]`
- **Max Age**: 3600 seconds

Update via variables for production use:
```hcl
variable "cors_allowed_origins" {
  default = ["https://your-domain.com"]
}
```

## 🏷️ Tags

The API Gateway is tagged with:
- `Name = iam-dashboard-api`
- `Project = IAMDash`
- `Env = dev` (or from variable)
- `ManagedBy = terraform`

## 📊 Outputs

After deployment, outputs include:
- API Gateway ID
- API Gateway ARN
- API Endpoint URL
- Full Invoke URL (with stage)
- Stage ID

## 🔗 Integration Points

API Gateway will:
1. Receive HTTP requests from the frontend
2. Route requests to the appropriate Lambda function
3. Transform responses back to HTTP
4. Handle CORS for browser requests
5. Provide throttling and rate limiting

## ⏱️ Rate limiting (throttling)

This API is an **HTTP API (API Gateway v2)**. Throttling uses **steady RPS** plus **burst** (token bucket) on the stage. HTTP APIs do **not** support REST-style **usage plans**, **API keys**, or a built-in **per-day quota**; those require a REST API or another layer (for example application quotas or WAF).

### Chosen limits (defaults)

| Route group | Routes | Steady RPS | Burst | Terraform variables |
|-------------|--------|------------|-------|---------------------|
| Individual scans | `POST /scan/security-hub`, `guardduty`, `config`, `inspector`, `macie`, `iam`, `ec2`, `s3` | 25 | 50 | `throttling_rate_limit`, `throttling_burst_limit` |
| Full scan | `POST /scan/full` | 5 | 10 | `throttling_scan_full_rate_limit`, `throttling_scan_full_burst_limit` |
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/session` | 35 | 70 | `throttling_auth_rate_limit`, `throttling_auth_burst_limit` |

Individual scan routes inherit **default_route_settings**. `POST /scan/full` and the auth routes use **route_settings** overrides on the same stage.

### Per-day caps

There is **no native per-day limit** on HTTP API throttling. To add a daily cap later, options include: migrate sensitive routes to a **REST API** with usage plans and quotas, enforce quotas in **Lambda** (for example DynamoDB counters), or use **WAF** / edge rules for abuse patterns. Until then, use CloudWatch on `429` responses and Lambda invocations for monitoring.

### How to change limits for scaling

1. Edit defaults in `variables.tf` or pass overrides when calling the module from `infra/main.tf`.
2. Run `terraform plan` and `terraform apply` from the `infra` root (or this module directory if applied standalone).
3. After deploy, clients exceeding limits receive **429 Too Many Requests** from API Gateway.

### Verifying throttling

- Use stage **access logs** (CloudWatch log group `/aws/apigwv2/<api-name>/<stage>/access`) and filter for `status` 429.
- Load-test gradually; burst allows short spikes above steady RPS.

