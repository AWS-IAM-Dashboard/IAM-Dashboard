# GitHub Actions OIDC Provider and IAM Role

This module creates the OIDC (OpenID Connect) provider and IAM role for GitHub Actions to securely deploy to AWS without storing long-lived credentials.

## 🎯 What This Does

1. **OIDC Provider**: Creates an AWS IAM OIDC identity provider for GitHub Actions
2. **IAM Role**: Creates a role with least-privilege permissions for deployment
3. **Policies**: Attaches scoped policies for:
   - S3 (frontend deployment and scan results)
   - Lambda (function code updates)
   - DynamoDB (scan results storage)
   - CloudFront (cache invalidation)
   - API Gateway (if needed)
   - Terraform state management (optional)

## 🔐 Security Features

- **No Long-Lived Credentials**: Uses OIDC for secure authentication
- **Least Privilege**: Only grants permissions needed for deployment
- **Repository Scoped**: Only works from the specified GitHub repository
- **Environment Specific**: Separate roles can be created for different environments

## 📁 Files

- `main.tf` - OIDC provider and IAM role definitions
- `variables.tf` - Configuration variables
- `outputs.tf` - Output values (role ARN, etc.)
- `README.md` - This file

## 🚀 Usage

### Deploy the Module

```bash
cd infra/github-actions
terraform init
terraform plan
terraform apply
```

### Configure GitHub Actions

The deployment workflow (`.github/workflows/deploy.yml`) uses this role:

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::ACCOUNT_ID:role/iam-dashboard-deployer-prod
    aws-region: us-east-1
```

### Update Variables

Create a `terraform.tfvars` file or override variables:

```hcl
github_repo_owner = "wakeensito"
github_repo_name = "IAM-Dashboard-AWS"
frontend_s3_bucket_name = "iam-dashboard-frontend"
scan_results_s3_bucket_name = "iam-dashboard-scan-results"
lambda_function_name = "iam-dashboard-scanner"
dynamodb_table_name = "iam-dashboard-scan-results"
```

## 📊 Outputs

After deployment, get the role ARN:

```bash
terraform output github_actions_role_arn
```

Use this ARN in your GitHub Actions workflow.

## 🔧 Permissions Granted

The role has the following permissions:

1. **S3**:
   - List, Get, Put, Delete on frontend bucket
   - List, Get, Put, Delete on scan results bucket

2. **Lambda**:
   - UpdateFunctionCode
   - GetFunction
   - ListFunctions

3. **DynamoDB**:
   - PutItem, GetItem, UpdateItem
   - Query, Scan on scan results table

4. **CloudFront**:
   - CreateInvalidation
   - GetInvalidation
   - ListInvalidations

5. **API Gateway**:
   - GET, POST, PUT, PATCH, DELETE on REST APIs

6. **Terraform State** (optional):
   - S3 access for state bucket
   - DynamoDB access for state locking

## 🛡️ Security Best Practices

1. **Repository Restriction**: The role only works from the specified GitHub repository
2. **Branch Protection**: Consider adding branch conditions in the assume role policy
3. **Environment Separation**: Create separate roles for dev/staging/prod
4. **Audit Logging**: Enable CloudTrail to monitor role usage
5. **Regular Review**: Periodically review and update permissions

## 🔍 Verification

After deployment, verify the role exists:

```bash
aws iam get-role --role-name iam-dashboard-deployer-prod
```

Check the OIDC provider:

```bash
aws iam list-open-id-connect-providers
```

## 📝 Notes

- The OIDC provider thumbprint is hardcoded for GitHub Actions
- The role name `iam-dashboard-deployer-prod` matches the deployment workflow
- All resources are tagged for easy identification
- The module follows least-privilege principles

## 🆘 Troubleshooting

### Role Not Found
- Ensure the module has been applied: `terraform apply`
- Check the role name matches the workflow: `iam-dashboard-deployer-prod`

### Permission Denied
- Verify the repository name matches in `variables.tf`
- Check that the workflow is running from the correct branch
- Review CloudTrail logs for specific permission errors

### OIDC Provider Already Exists
- AWS only allows one OIDC provider per URL
- If it exists, import it: `terraform import aws_iam_openid_connect_provider.github arn:aws:iam::ACCOUNT:oidc-provider/token.actions.githubusercontent.com`

