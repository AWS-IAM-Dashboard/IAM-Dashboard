# Cognito User Pool Setup Guide

## Summary

This guide details the configuration and deployment of the Amazon Cognito User Pool for the IAM Dashboard. It provides OAuth 2.0 authentication and issues JWT tokens to authorize access to the dashboard and backend APIs.

## Prerequisites

1. **AWS CLI & Terraform installed**
2. **AWS credentials** configured for the account/role you deploy with.

## Architecture & OAuth 2.0 Flow

1. **Login**: The user is redirected to the Cognito Hosted UI.
2. **Authenticate**: The user signs in; Cognito returns an authorization code to the configured callback URL.
3. **Token exchange**: The frontend (via `react-oidc-context`) exchanges the code for ID, Access, and Refresh tokens.
4. **Validation**: The backend validates the JWT (B10) before serving protected routes.

## Step-by-Step Instructions

### Step 1: Navigate to the Cognito module

```bash
cd infra/cognito
```

### Step 2: Configure variables

Create a `terraform.tfvars` (or use root-level vars) with:

- `user_pool_name` – e.g. `iam-dashboard-user-pool`
- `cognito_domain` – globally unique Hosted UI prefix (e.g. `iam-dashboard-auth`)
- `callback_urls` – list of callback URLs (e.g. `["http://localhost:5173/", "https://d33ytnxd7i6mo9.cloudfront.net/"]`)
- `logout_urls` – list of sign-out URLs (same origins as above)

### Step 3: Initialize and apply (from repo root)

From `infra/`:

```bash
cd infra
terraform init
terraform plan
terraform apply
```

### Success criteria

- User Pool created with email as username attribute.
- App client with `openid`, `email`, `profile` scopes and correct callback/logout URLs.
- Hosted UI domain active.

### Environment variables for the app

After apply, use Terraform outputs to set frontend env vars:

- `VITE_COGNITO_AUTHORITY` = `https://cognito-idp.<region>.amazonaws.com/<user_pool_id>`
- `VITE_COGNITO_CLIENT_ID` = client id output
- `VITE_COGNITO_REDIRECT_URI` = one of the callback URLs
- `VITE_COGNITO_DOMAIN` = `https://<domain>.auth.<region>.amazoncognito.com`

See `docs/backend/cognito-infrastructure.md` for full flow and backend integration.

### Troubleshooting

- **Domain already exists**: Choose a different `cognito_domain` prefix.
- **Manual user verification (dev)**:  
  `aws cognito-idp admin-confirm-sign-up --user-pool-id <id> --username <email>`

### Cleanup

```bash
terraform destroy
```

(Careful: this deletes the User Pool and all users.)
