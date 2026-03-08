# GitHub Actions Workflows

## 🔐 Required Secrets

Before deploying, you must configure the following secrets in GitHub:

### AWS_ROLE_ARN
- **Purpose**: IAM Role ARN for GitHub Actions to assume via OIDC
- **Location**: Repository Settings → Secrets and variables → Actions
- **Format**: `arn:aws:iam::ACCOUNT_ID:role/IAMDash-Deployer-Prod`
- **How to get**: Run `terraform output github_actions_role_arn` after deploying the `infra/github-actions` module

### Setup Instructions

1. Deploy the GitHub Actions OIDC module:
   ```bash
   cd infra/github-actions
   terraform init
   terraform apply
   ```

2. Get the role ARN:
   ```bash
   terraform output github_actions_role_arn
   ```

3. Add to GitHub Secrets:
   - Go to: Repository → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `AWS_ROLE_ARN`
   - Value: The ARN from step 2
   - Click "Add secret"

## 📋 Workflows

### deploy.yml
- **Triggers**: Push and Pull_Request to `main` branch
- **Actions**:
   - Runs the `devsecops` and `dependency-audit` security scans
   - Builds and deploys frontend to S3
   - **Builds Lambda package in Docker** (see `infra/lambda/Dockerfile.build`) then updates Lambda        function code — deps are not in the repo; the zip is built in CI
   - No Terraform in this workflow (infra is applied separately)
- **Secrets Required**: `AWS_ROLE_ARN`
- **Docs**: Lambda build approach and local commands → [infra/lambda/README.md](../../infra/lambda/README.md)

> [!NOTE]
> The deploy workflow only runs if the **devsecops-scan.yml** and **dependency-audit.yml** workflows run, and are successful.
> The deploy workflow only deploys code on pushes to the main branch

### devsecops-scan.yml
- **Triggers**: Invoked by `deploy.yml` on Push or Pull_Request
- **Actions**:
  - Runs security scanners (gitleaks, checkov, OPA)
  - Uploads results as artifacts
- **Secrets Required**: None

### dependency-audit.yml
- **Triggers**: Invoked by `deploy.yml` on Push or Pull_Request
- **Actions**: 
   - Scans the Frontend dependencies for vulnerabilities using NPM
   - Scans the root requirements.txt file
   - Scans the requirements.txt file for the lambda package
   - Fails if any vulnerabilites are found in either the Frontend or Backend
   - Uploads results as artifacts
- **Secrets Required**: None
- **Docs**: 
   - Lambda requirements.txt -> [infra/lmabda/requirements.txt](../../infra/lambda/requirements.txt)
   - Root requirements.txt -> [./requirements.txt](../../requirements.txt)

### terraform-apply.yml

## 🔒 Security Notes

- Never commit AWS account IDs or ARNs directly in workflow files
- Always use GitHub Secrets for sensitive values
- The OIDC provider ensures GitHub Actions can only assume the role from your repository

