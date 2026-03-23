# Cognito User Pool Setup Guide

## Summary

This guide describes the Cognito Terraform module used by the IAM Dashboard. The module provisions the Cognito User Pool, app client, hosted UI domain, seeded users, and related resources that support the current frontend login flow and API Gateway JWT authorization.

## Prerequisites

1. **AWS CLI and Terraform installed**
2. **AWS credentials** configured for the account or role you deploy with

## Current authentication architecture

1. **Login UI**: The user signs in through the application's own username/password form.
2. **Cognito authentication**: The frontend authenticates directly against Cognito and receives ID, Access, and Refresh tokens.
3. **Session persistence**: The frontend stores the session in browser storage and restores it on reload.
4. **Protected API routes**: API Gateway validates Cognito JWTs on protected routes before invoking Lambda.

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

See `docs/backend/cognito-infrastructure.md` for the current frontend and API Gateway auth flow.

## Troubleshooting

- **Domain already exists**: Choose a different `cognito_domain_prefix`.
- **Manual user verification (dev)**:
  `aws cognito-idp admin-confirm-sign-up --user-pool-id <id> --username <username>`
- **Login succeeds but protected API calls return 401**:
  - Confirm API Gateway is using the Cognito issuer and app client ID from Terraform outputs.
  - Confirm the frontend is sending `Authorization: Bearer <access_token>`.

## Cleanup

```bash
terraform destroy
```

Careful: this deletes the User Pool and all users.
