# Cognito User Pool Setup Guide

## Summary

This guide describes the Cognito Terraform module used by the IAM Dashboard. The module provisions the Cognito User Pool, app client, hosted UI domain, seeded users, and related resources that support the current frontend login flow and API Gateway JWT authorization.

## Prerequisites

1. **AWS CLI and Terraform installed**
2. **AWS credentials** configured for the account or role you deploy with

## Current authentication Flow

1. The frontend submits credentials to `POST /auth/login`.
2. API Gateway routes the request to the auth Lambda.
3. Lambda authenticates the user against Cognito.
4. Lambda creates or replaces the server-side session record in DynamoDB.
5. Lambda returns an HttpOnly session cookie to the browser.
6. The browser includes that cookie on later `GET /auth/session` and `POST /auth/logout` requests.
7. Lambda uses the cookie value to load or clear the authoritative session state.

The Cognito Hosted UI domain is still provisioned by Terraform, but it is not the primary login experience for the current SPA.

## Step-by-step instructions

### Step 1: Navigate to the Cognito module

```bash
cd infra/cognito
```

### Step 2: Configure variables

Create a `terraform.tfvars` for the module directly, or provide the equivalent root-level variables when wiring through `infra/main.tf`.

The key inputs are:

- `aws_region`
- `environment`
- `project_name`
- `cognito_domain_prefix`
- `callback_urls`
- `logout_urls`

Notes:
- `cognito_domain_prefix` must be globally unique for the Cognito domain.
- `callback_urls` and `logout_urls` remain part of the app client configuration even though the current SPA primarily uses custom in-app login.

### Step 3: Initialize and apply

From `infra/` when using the root stack:

```bash
cd infra
terraform init
terraform plan
terraform apply
```

Or validate the standalone module directly:

```bash
cd infra/cognito
terraform init -backend=false
terraform validate
```

## Success criteria

- User Pool created with **username-based sign-in** and required `email` attribute.
- App client created with `openid`, `email`, and `profile` scopes.
- Hosted UI domain active.
- Terraform outputs available for frontend and API Gateway wiring.

## Environment variables for the app

After apply, use Terraform outputs to set frontend env vars for the current custom login flow:

- `VITE_COGNITO_AUTHORITY` = `https://cognito-idp.<region>.amazonaws.com/<user_pool_id>`
- `VITE_COGNITO_CLIENT_ID` = Cognito app client ID output

Additional redirect/logout variables may still exist in older env files from the previous Hosted UI redirect flow. They should not be treated as the primary auth path for the current SPA.

See [Authentication Flow](../../docs/backend/Authentication_Flow.md) for the current frontend and API Gateway auth flow.

## Troubleshooting
- **Domain already exists**: Choose a different `cognito_domain_prefix`.

## Cleanup

```bash
terraform destroy
```

Careful: this deletes the User Pool and all users.
