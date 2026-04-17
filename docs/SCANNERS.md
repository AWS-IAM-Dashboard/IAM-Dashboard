# Introduction to Security Scanners
## A Beginner's Guide to OPA, Checkov, and Gitleaks

Welcome to the IAM Dashboard project! This guide will introduce you to three essential security scanning tools that help keep our codebase secure. Don't worry if you've never heard of these tools before - we'll walk through everything step by step.

## Table of Contents
1. [What are Security Scanners?](#what-are-security-scanners)
2. [OPA (Open Policy Agent)](#opa-open-policy-agent)
3. [Checkov](#checkov)
4. [Gitleaks](#gitleaks)
5. [Running Scans with Make](#running-scans-with-make)
6. [Understanding Results](#understanding-results)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## What are Security Scanners?

Security scanners are automated tools that examine your code for potential security issues, vulnerabilities, and policy violations. Think of them as automated code reviewers that never get tired and always follow the same rules consistently.

**Why do we use them?**
- **Catch issues early**: Find problems before they reach production
- **Consistent standards**: Everyone follows the same security rules
- **Save time**: Automate what would take hours of manual review
- **Learn security**: Understand security best practices by seeing violations

---

## OPA (Open Policy Agent)

### What is OPA?
OPA is a "Policy as Code" tool. Instead of writing security rules in documentation that people might forget, we write them as code that gets automatically enforced.

### What does OPA do in our project?
- **IAM Policy Validation**: Ensures AWS IAM policies follow security best practices
- **Access Control**: Validates that permissions aren't too broad
- **Compliance**: Checks that we follow organizational security policies

### Example: What OPA catches
```json
// ❌ BAD: This IAM policy is too permissive
{
  "Effect": "Allow",
  "Action": "*",           // Allows ALL actions
  "Resource": "*"          // On ALL resources
}

// ✅ GOOD: This IAM policy is specific
{
  "Effect": "Allow",
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::my-bucket/*"
}
```

### Our OPA Policies
- **Location**: `DevSecOps/opa-policies/`
- **Files**: 
  - `security.rego` - General security policies
  - `iam-policies.rego` - IAM-specific policies
  - `terraform.rego` - Terraform security policies
  - `kubernetes.rego` - Kubernetes security policies

---

## Checkov

### What is Checkov?
Checkov scans your infrastructure code (like Terraform, CloudFormation, Dockerfiles) for security misconfigurations and compliance violations.

### What does Checkov scan in our project?
- **Dockerfiles**: Checks for security best practices
- **Infrastructure as Code**: Validates cloud resource configurations
- **Kubernetes**: Scans Kubernetes manifests
- **AWS Resources**: Validates AWS service configurations

### Example: What Checkov catches
```S3 Bucket
# ❌ BAD: Public S3 bucket
resource "aws_s3_bucket" "data" {
  bucket = "public-bucket"
  acl    = "public-read"
}
# ✅ GOOD: Secured S3 bucket
resource "aws_s3_bucket" "data" {
  bucket = "secure-bucket"
}
resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  bucket = aws_s3_bucket.data.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
```

---

## Gitleaks

### What is Gitleaks?
Gitleaks scans your Git repository for accidentally committed secrets like API keys, passwords, and tokens.

### What does Gitleaks catch?
- **API Keys**: AWS access keys, GitHub tokens
- **Passwords**: Database passwords, service passwords
- **Tokens**: JWT tokens, OAuth tokens
- **Private Keys**: SSH keys, SSL certificates

### Example: What Gitleaks catches
```python
# ❌ BAD: Hardcoded secret in code
aws_access_key = "AKIA_EXAMPLE_KEY_NOT_REAL"
aws_secret_key = "EXAMPLE_SECRET_KEY_NOT_REAL"

# ✅ GOOD: Using environment variables
import os
aws_access_key = os.getenv('AWS_ACCESS_KEY_ID')
aws_secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
```


---

## Docker Compose Integration

All security scanners are integrated into our `docker-compose.yml` file using profiles. This means:

- **No local installation required** - everything runs in Docker containers
- **Consistent environment** - same versions across all team members
- **Easy management** - use `docker-compose` commands to manage scanners
- **Isolated execution** - scanners run in separate containers

### Scanner Services in Docker Compose

```yaml
# OPA Policy Scanner
opa-scanner:
  image: openpolicyagent/opa:0.58.0
  profiles: [scanners]
  # ... configuration

# Checkov Infrastructure Scanner  
checkov-scanner:
  image: bridgecrew/checkov:3.1.25
  profiles: [scanners]
  # ... configuration

# Gitleaks Secret Scanner
gitleaks-scanner:
  image: zricethezav/gitleaks:v8.18.0
  profiles: [scanners]
  # ... configuration
```

## Running Scans with Make

We've created a simple Makefile so you can run all scans with easy commands. No need to remember complex tool syntax!

### Prerequisites
**No local installation required!** All tools run in Docker containers.

```bash
# Just make sure Docker and Docker Compose are installed
docker --version
docker-compose --version

# If not installed, follow these links:
# Docker: https://docs.docker.com/get-docker/
# Docker Compose: https://docs.docker.com/compose/install/
```

### Available Make Commands

```bash
# Run all security scans
make scan

# Run individual scans
make opa         # Run OPA policy validation
make checkov     # Run Checkov infrastructure scan
make gitleaks    # Run Gitleaks secret detection

# Utility commands
make clean-scans # Clean up scan results and containers
make check-docker # Check if Docker is available
make help        # Show all available commands
```

### Quick Start
```bash
# 1. Navigate to your project directory
cd /path/to/your/IAM-Dashboard

# 2. Check Docker is available
make check-docker

# 3. Run all security scans
make scan

# 4. Check the results
make show-results
```

---

## Understanding Results

### OPA Results
- **Format**: Human-readable text output
- **Location**: Console output
- **What to look for**: 
  - `deny` messages indicate policy violations
  - `allow` means the policy passed

### Checkov Results
- **Format**: JSON and CLI output
- **Location**: `checkov-results.json` (in project root)
- **What to look for**:
  - `PASS` - Check passed
  - `FAIL` - Security issue found
  - `SKIP` - Check was skipped

### Gitleaks Results
- **Format**: JSON output
- **Location**: `gitleaks-results.json` (in project root)
- **What to look for**:
  - Any findings indicate potential secrets
  - Check if they're false positives

---

## Best Practices

### Before You Start Coding
1. **Run scans early**: Don't wait until the end
2. **Fix issues immediately**: Don't let them accumulate
3. **Understand the rules**: Read the policy files to understand what's being checked

### When You Get Violations
1. **Don't panic**: Most violations are easy to fix
2. **Read the error message**: It usually tells you exactly what's wrong
3. **Ask for help**: If you're unsure, ask your team
4. **Learn from it**: Each violation is a learning opportunity

### Common Fixes
- **OPA violations**: Make IAM policies more specific
- **Checkov violations**: Add security configurations to Dockerfiles
- **Gitleaks violations**: Move secrets to environment variables

---

## Troubleshooting

### Docker Issues
```bash
# Check if Docker is running
make check-docker

# If Docker is not running, start it:
# - Docker Desktop: Start the application
# - Linux: sudo systemctl start docker
# - macOS: brew services start docker
```

### Permission Issues
```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER
newgrp docker

# Reset Docker permissions (macOS)
sudo chown -R $USER ~/.docker
```

### False positives in Gitleaks
If Gitleaks finds something that's not actually a secret:
1. Check if it's in the exclude patterns in `.gitleaks.toml`
2. Add it to the exclude list if needed
3. Ask your team lead before modifying the config

### OPA policy errors
If OPA policies seem too strict:
1. Read the policy file to understand the rule
2. Discuss with your team if the rule should be modified
3. Don't disable policies without team approval

---

## Getting Help

### Resources
- **OPA Documentation**: https://www.openpolicyagent.org/docs/
- **Checkov Documentation**: https://www.checkov.io/
- **Gitleaks Documentation**: https://github.com/gitleaks/gitleaks

### Team Support
- Ask questions in your team chat
- Review the existing policy files for examples
- Check the GitHub Actions logs for automated scan results

---

## Next Steps

1. **Check Docker is available** with `make check-docker`
2. **Run your first scan** with `make scan`
3. **Explore the policy files** in `DevSecOps/opa-policies/`
4. **Try making a small change** and see how the scans react
5. **Ask questions** - we're here to help!

Remember: Security scanning is not about being perfect from day one. It's about building good habits and learning to write secure code. Every scan result is an opportunity to improve your security knowledge!

---

*Happy coding and stay secure! 🔒*
