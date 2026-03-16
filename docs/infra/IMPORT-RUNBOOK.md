# Terraform import runbook – sync state with existing AWS resources

When CI (or a fresh state) runs `terraform apply`, Terraform may try to **create** resources that already exist in AWS, causing errors like `EntityAlreadyExists`, `BucketAlreadyExists`, or `ResourceConflictException`. **Import** links those existing resources to the resource blocks in your code so Terraform stops trying to create them.

Run these from the repo root. Use the same AWS profile/credentials and backend as CI (so state is shared).

---

## Prerequisites

- AWS CLI configured (same account as CI).
- Terraform initialized with the remote backend: `cd infra && terraform init -input=false`.

---

## 1. KMS key – use existing key (no import)

The root `main.tf` now uses a **data source** for the KMS key, so Terraform does not create a key and CI does not need `kms:CreateKey`.

- **If your key has alias `alias/IAM-Dashboard-Keys`:** No change; the default `kms_key_id` is that alias.
- **If your key has a different alias or no alias:** Set the key alias or key ID when running Terraform, and do not commit it:
  - Local: `export TF_VAR_kms_key_id=alias/your-alias` or use a non-committed `terraform.tfvars`.
  - CI: Add a secret or variable (e.g. `TF_VAR_kms_key_id`) with the alias or key ID.

**If state still has the old KMS resource** (e.g. `aws_kms_key.logs` or `aws_kms_key.IAM_Dashboard_Key`) and you switched to the data source, remove it from state so Terraform does not plan to destroy the real key:

```bash
cd infra
terraform state rm 'aws_kms_key.logs' 2>/dev/null || true
terraform state rm 'aws_kms_alias.logs' 2>/dev/null || true
terraform state rm 'aws_kms_key.IAM_Dashboard_Key' 2>/dev/null || true
```

---

## 2. Get API Gateway IDs (do this first if you need to import API Gateway)

You need the API ID (and later the integration ID and route IDs) for API Gateway imports. From the repo root, with AWS CLI configured:

```bash
# List HTTP APIs and note the ApiId for iam-dashboard-api
aws apigatewayv2 get-apis --region us-east-1 --query "Items[?Name=='iam-dashboard-api'].{ApiId:ApiId,Name:Name}" --output table
```

Set the API ID in a variable and fetch integration and route IDs:

```bash
API_ID="erh3a09d7l"   # replace with your ApiId from the command above
aws apigatewayv2 get-integrations --api-id "$API_ID" --region us-east-1 --query "Items[].{IntegrationId:IntegrationId}" --output text
aws apigatewayv2 get-routes --api-id "$API_ID" --region us-east-1 --query "Items[].{RouteId:RouteId,RouteKey:RouteKey}" --output table
```

Note the **IntegrationId** (single value) and each **RouteId** (one per route). You will use these in the API Gateway imports below.

---

## 3. Import all resources (run in order)

Run from the repo root. Use the same AWS profile and region as CI. Run `cd infra && terraform init -input=false` once before starting.

```bash
cd infra
terraform init -input=false
```

Then run the imports below. If a resource is already in state, Terraform will say so and you can skip it. Replace `YOUR_API_ID`, `YOUR_INTEGRATION_ID`, and `YOUR_ROUTE_ID` with the values from section 2 (or use the script in section 4).

### 3.1 Core resources (do these first)

```bash
# S3 bucket
terraform import 'module.s3.aws_s3_bucket.frontend' iam-dashboard-project

# S3 bucket configuration (same bucket name for each)
terraform import 'module.s3.aws_s3_bucket_versioning.frontend' iam-dashboard-project
terraform import 'module.s3.aws_s3_bucket_server_side_encryption_configuration.frontend' iam-dashboard-project
terraform import 'module.s3.aws_s3_bucket_lifecycle_configuration.frontend' iam-dashboard-project
terraform import 'module.s3.aws_s3_bucket_website_configuration.frontend' iam-dashboard-project
# Only if you use bucket policy and public access block (adjust [0] if your count differs):
terraform import 'module.s3.aws_s3_bucket_policy.frontend[0]' iam-dashboard-project
terraform import 'module.s3.aws_s3_bucket_public_access_block.frontend[0]' iam-dashboard-project

# IAM roles
terraform import 'module.lambda.aws_iam_role.lambda_role' iam-dashboard-lambda-role
terraform import 'module.github_actions.aws_iam_role.github_actions_deployer' iam-dashboard-deployer-prod

# Lambda role inline policy (role_name:policy_name)
terraform import 'module.lambda.aws_iam_role_policy.lambda_policy' iam-dashboard-lambda-role:iam-dashboard-lambda-role-policy

# Lambda function
terraform import 'module.lambda.aws_lambda_function.scanner' iam-dashboard-scanner

# DynamoDB table
terraform import 'module.dynamodb.aws_dynamodb_table.scan_results' iam-dashboard-scan-results
```

### 3.2 API Gateway (use your API ID and IDs from section 2)

**Pre-filled for API `erh3a09d7l`** (integration `vpboeln`, route IDs from current AWS):

```bash
API_ID="erh3a09d7l"
INTEGRATION_ID="vpboeln"

# API and stage
terraform import 'module.api_gateway.aws_apigatewayv2_api.api' "$API_ID"
terraform import 'module.api_gateway.aws_apigatewayv2_stage.default' "${API_ID}/v1"
terraform import 'module.api_gateway.aws_apigatewayv2_integration.lambda' "${API_ID}/${INTEGRATION_ID}"

# CloudWatch log group for API Gateway
terraform import 'module.api_gateway.aws_cloudwatch_log_group.apigw_access' /aws/apigwv2/iam-dashboard-api/v1/access

# Lambda permission (API Gateway invoke)
terraform import 'module.api_gateway.aws_lambda_permission.api_gateway' iam-dashboard-scanner/AllowExecutionFromAPIGateway

# Routes (IDs verified for API erh3a09d7l)
terraform import 'module.api_gateway.aws_apigatewayv2_route.security_hub' "${API_ID}/efld6mh"
terraform import 'module.api_gateway.aws_apigatewayv2_route.guardduty' "${API_ID}/4ts67c3"
terraform import 'module.api_gateway.aws_apigatewayv2_route.config' "${API_ID}/cr7l157"
terraform import 'module.api_gateway.aws_apigatewayv2_route.inspector' "${API_ID}/cgzlgb6"
terraform import 'module.api_gateway.aws_apigatewayv2_route.macie' "${API_ID}/dp5yjei"
terraform import 'module.api_gateway.aws_apigatewayv2_route.iam' "${API_ID}/gazure2"
terraform import 'module.api_gateway.aws_apigatewayv2_route.ec2' "${API_ID}/5wxmjbg"
terraform import 'module.api_gateway.aws_apigatewayv2_route.s3' "${API_ID}/23y1nw0"
terraform import 'module.api_gateway.aws_apigatewayv2_route.full' "${API_ID}/jg8iw23"
```

If you use a different API (e.g. `h9ag05hefc` or `qy1ie5dw13`), replace `API_ID` and re-run the section 2 commands to get that API’s integration and route IDs.

### 3.3 GitHub Actions role inline policies (role_name:policy_name)

```bash
terraform import 'module.github_actions.aws_iam_role_policy.github_actions_s3_policy' iam-dashboard-deployer-prod:iam-dashboard-deployer-prod-s3-policy
terraform import 'module.github_actions.aws_iam_role_policy.github_actions_lambda_policy' iam-dashboard-deployer-prod:iam-dashboard-deployer-prod-lambda-policy
terraform import 'module.github_actions.aws_iam_role_policy.github_actions_dynamodb_policy' iam-dashboard-deployer-prod:iam-dashboard-deployer-prod-dynamodb-policy
terraform import 'module.github_actions.aws_iam_role_policy.github_actions_cloudfront_policy' iam-dashboard-deployer-prod:iam-dashboard-deployer-prod-cloudfront-policy
terraform import 'module.github_actions.aws_iam_role_policy.github_actions_apigateway_policy' iam-dashboard-deployer-prod:iam-dashboard-deployer-prod-apigateway-policy
terraform import 'module.github_actions.aws_iam_role_policy.github_actions_iam_read_policy' iam-dashboard-deployer-prod:iam-dashboard-deployer-prod-iam-read-policy
terraform import 'module.github_actions.aws_iam_role_policy.github_actions_terraform_state_policy' iam-dashboard-deployer-prod:iam-dashboard-deployer-prod-terraform-state-policy
```

---

## 4. Optional: script to import API Gateway routes

After importing the API, stage, and integration, you can match route keys to route IDs and import in a loop. Save as `infra/scripts/import-apigw-routes.sh` and run from repo root after setting `API_ID`:

```bash
#!/usr/bin/env bash
set -e
API_ID="${API_ID:-erh3a09d7l}"
REGION="${REGION:-us-east-1}"
cd "$(dirname "$0")/.."

# Map route_key to Terraform resource name (from api-gateway/main.tf)
declare -A ROUTES=(
  ["POST /scan/security-hub"]="security_hub"
  ["POST /scan/guardduty"]="guardduty"
  ["POST /scan/config"]="config"
  ["POST /scan/inspector"]="inspector"
  ["POST /scan/macie"]="macie"
  ["POST /scan/iam"]="iam"
  ["POST /scan/ec2"]="ec2"
  ["POST /scan/s3"]="s3"
  ["POST /scan/full"]="full"
)

for ROUTE_KEY in "${!ROUTES[@]}"; do
  NAME="${ROUTES[$ROUTE_KEY]}"
  ROUTE_ID=$(aws apigatewayv2 get-routes --api-id "$API_ID" --region "$REGION" --query "Items[?RouteKey=='$ROUTE_KEY'].RouteId" --output text)
  if [ -n "$ROUTE_ID" ]; then
    echo "Importing route $NAME ($ROUTE_KEY) -> $ROUTE_ID"
    terraform import "module.api_gateway.aws_apigatewayv2_route.$NAME" "${API_ID}/${ROUTE_ID}"
  fi
done
```

---

## 5. After importing

Run a plan and fix any remaining drift:

```bash
cd infra
terraform plan -input=false -no-color
```

You should see no **create** for the resources you imported; at most **update in-place**. If Terraform still wants to create something that exists in AWS, add the matching `terraform import` for that resource (use `terraform state list` to see resource addresses).

---

## 6. CI

- Ensure the role used by CI (e.g. `IAM-Dash-GitHub-CD/GitHubActions`) has at least: `kms:DescribeKey` (for the KMS data source), and the same permissions Terraform needs for the resources it manages (S3, IAM, Lambda, API Gateway, DynamoDB). It does **not** need `kms:CreateKey` when using the data source.
- If you use a non-default KMS key alias/ID, set `TF_VAR_kms_key_id` in the workflow (e.g. from a GitHub secret) so the data source can resolve the key.
