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
- **Throttling**: 100 burst, 50 rate limit per second
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

