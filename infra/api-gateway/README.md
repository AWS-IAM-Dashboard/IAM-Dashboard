# API Gateway for IAM Dashboard

## 🎯 What This Does

Creates an AWS API Gateway (HTTP API) as a placeholder structure for the 9 security scan endpoints. This will be integrated with the Lambda function once it's fully implemented.

## 📋 Planned API Endpoints

The following 9 endpoints will be implemented:

1. `POST /scan/security-hub` - Trigger Security Hub scan
2. `POST /scan/guardduty` - Trigger GuardDuty scan
3. `POST /scan/config` - Trigger AWS Config scan
4. `POST /scan/inspector` - Trigger Inspector scan
5. `POST /scan/macie` - Trigger Macie scan
6. `POST /scan/iam` - Run IAM OPA policy scan
7. `POST /scan/ec2` - Run EC2 OPA policy scan
8. `POST /scan/s3` - Run S3 OPA policy scan
9. `POST /scan/full` - Run all scanners (full security scan)

## 📁 Files Created

- `infra/api-gateway/main.tf` - API Gateway REST API configuration
- `infra/api-gateway/variables.tf` - Input variables
- `infra/api-gateway/outputs.tf` - Output values
- `infra/api-gateway/README.md` - This file

## 🚀 How to Deploy (Placeholder)

```bash
cd infra/api-gateway
terraform init
terraform plan
terraform apply
```

**Note**: This creates the API Gateway structure, but routes and Lambda integrations will be added when the Lambda function is ready.

## 🔧 Current Configuration

- **API Name**: `iam-dashboard-api`
- **Protocol**: HTTP API (v2)
- **Stage**: `v1`
- **CORS**: Enabled with configurable origins
- **Throttling**: 100 burst, 50 rate limit per second

## 🔐 Authentication (Cognito JWT)

All `/scan/*` endpoints are protected by an **Amazon Cognito JWT authorizer** on the HTTP API.

### Required Terraform Variables

Pass these variables when applying the `api-gateway` module:

- `cognito_user_pool_arn` – ARN of the Cognito User Pool that issues JWTs.
- `cognito_user_pool_client_id` – App client ID used as the JWT audience.

The authorizer is configured as:

- **Type**: JWT
- **Identity source**: `Authorization` header (`Bearer <jwt-token>`)
- **Issuer**: `https://cognito-idp.<aws_region>.amazonaws.com/<user_pool_id>`
- **Audience**: `[cognito_user_pool_client_id]`

### Protected Routes

The following routes require a valid Cognito JWT:

- `POST /scan/security-hub`
- `POST /scan/guardduty`
- `POST /scan/config`
- `POST /scan/inspector`
- `POST /scan/macie`
- `POST /scan/iam`
- `POST /scan/ec2`
- `POST /scan/s3`
- `POST /scan/full`

Clients (frontend, CLI, or other services) must:

1. Obtain a JWT from Cognito (ID or access token).
2. Send it on every request:

   ```http
   Authorization: Bearer <jwt-token>
   ```

## 🔄 Next Steps (When Lambda is Ready)

1. **Create Routes**: Add route definitions for each of the 9 endpoints
2. **Lambda Integration**: Integrate each route with the Lambda function
3. **Request/Response Mapping**: Configure request/response transformations
4. **Authorization**: Refine scopes/claims in Cognito as needed
5. **Deployment**: Deploy to stage and test endpoints

## 📝 Example Route Integration (Future)

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
- **Allowed Origins**: `["*"]` (configure via variable)
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

Once Lambda is ready, the API Gateway will:
1. Receive HTTP requests from the frontend
2. Route requests to the appropriate Lambda handler
3. Transform responses back to HTTP
4. Handle CORS for browser requests
5. Provide throttling and rate limiting

