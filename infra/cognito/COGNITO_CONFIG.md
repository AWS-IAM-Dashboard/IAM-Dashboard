# Cognito User Pool Setup Guide

## Summary
This guide details the configuration and deployment of the Amazon Cognito User Pool for the IAM Dashboard. It provides OAuth 2.0 authentication and issues JWT tokens to authorize access to security scanners.

## Prerequisites
1. **AWS CLI & Terraform installed** (Refer to [DYNAMODB_SETUP.md](DYNAMODB_SETUP.md) for version requirements).
2. **AWS Credentials**: Configured locally for the `IAMDash-Developer-Dev` role.

## Architecture & OAuth 2.0 Flow
The dashboard utilizes Cognito User Pools as an OAuth 2.0 provider to secure backend requests and ensure data confidentiality.



1. **Login**: The user attempts to access the dashboard and is redirected to the Cognito Hosted UI.
2. **Authenticate**: The user authenticates against the user pool; Cognito responds with an authorization code.
3. **Token Exchange**: The backend service exchanges the application code for JWT tokens (ID, Access, and Refresh).
4. **Validation**: Subsequent requests are screened for JWT validation to authorize scanner actions.

## Step-by-Step Instructions

### Step 1: Navigate to Infrastructure Directory
```bash
cd infra/cognito
```

### Step 2: Initialize Terraform
This downloads the required AWS providers and initializes the working directory.
```bash
terraform init
```

### Step 3: Review the Plan
Before applying, verify the resources to be created.
```bash
terraform plan
```

### Step 4: Apply Configuration
Create a local `terraform.tfvars` file (ignored by Git) to provide your unique domain prefix. Then run:
```bash
terraform apply
```
*Type `yes` when prompted to create the Pool, Client, and Domain resources.*

### Success Criteria
- ✅ User Pool created with `email` as the primary username attribute.
- ✅ Password policy enforced: Min 12 chars, requires uppercase, lowercase, numbers, and symbols.
- ✅ App Client configured with `openid`, `email`, and `profile` scopes.
- ✅ Hosted UI domain active and accessible for user redirection.

### Environment Variables
Add these values (provided by Terraform outputs) to your `.env `file to connect the application:
```bash
# Cognito Configuration
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_DOMAIN=your-unique-domain-prefix
AWS_REGION=us-east-1
```
### Troubleshooting
**Error: "Domain already exists"**

Cognito domains must be globally unique. If the deployment fails, update the domain value in your local `terraform.tfvars` file.

**Manual User Verification**

To skip email verification during development, use the following CLI command:
```bash
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id <your-user-pool-id> \
  --username <user-email>
```

**Cleanup**

To remove the authentication infrastructure (Careful: this deletes all users):
```bash
terraform destroy
```


