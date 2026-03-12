# IAM Dashboard

A **security team work haven** that centralizes vulnerability scanning and findings to enhance SOC analyst and security engineer workflows. One place to see AWS security posture, triage findings, track tickets, and reduce tool-switching.

## 🎯 Who It's For

- **SOC Analysts** – Centralized view of vulnerabilities across IAM, EC2, S3, Security Hub, GuardDuty, Inspector, and Macie; create and track tickets for findings
- **Security Engineers** – Scan results, compliance status, and risk scoring in one dashboard; assign and manage remediation tickets
- **Security Teams** – Single pane of glass for triage, prioritization, ticket tracking, and reporting

## 🚀 Quick Start

### One-Command Setup

```bash
# 1. Clone the repository (GitHub Organization – no fork needed)
git clone https://github.com/AWS-IAM-Dashboard/IAM-Dashboard.git

cd IAM-Dashboard

# 2. Start the application
docker-compose up -d
```

# 2. Start the application

docker-compose up -d

### Full-Stack Development

New contributors only need Docker. No need to install Node.js or run `npm install` locally.

```bash
# Start all services (includes Vite frontend on port 3001 with hot reload)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

The **frontend** runs the Vite dev server in a container at http://localhost:3001 with hot reload; edit `src/` and the browser updates automatically.

## 🌐 Access Points

- **Frontend (Vite dev server, hot reload)**: http://localhost:3001 — runs in Docker; no Node.js/npm needed on host
- **Main Dashboard (Flask)**: http://localhost:5001
- **Grafana Monitoring**: http://localhost:3000 (admin/admin)
- **Prometheus Metrics**: http://localhost:9090

## 🔍 Run DevSecOps Scans

### Quick Security Scan

```bash
# Run all security scans (OPA + Checkov + Gitleaks)
make scan

# Run individual scans
make opa         # OPA policy validation
make checkov     # Infrastructure security scan
make gitleaks    # Secret detection scan
```

### Prerequisites

- Docker and Docker Compose installed
- No local tool installation required

### Troubleshooting

**Docker Issues:**
```bash
# Check Docker status
make check-docker

# Clean up containers
make clean-scans

# Restart Docker service (if needed)
sudo systemctl restart docker  # Linux
sudo service docker restart    # macOS
```

**Permission Issues:**
```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER
newgrp docker

# Reset Docker permissions (macOS)
sudo chown -R $USER ~/.docker
```

**Common Issues:**
- **Port conflicts**: Ensure ports 3001 (frontend), 3000 (Grafana), 5001, 5432, 6379, 9090 are available
- **Docker not running**: Start Docker Desktop or Docker daemon
- **Permission denied**: Check Docker group membership
- **Out of space**: Run `docker system prune` to clean up

## 🏗️ Architecture

This project provides a security team work haven with:

### Frontend (React + TypeScript)
- Modern React dashboard with TypeScript and Vite
- Responsive design with dark theme
- Radix UI components and Recharts for visualization
- Real-time security findings and scan results
- Interactive security analysis tools (IAM, EC2, S3, Security Hub, GuardDuty, Inspector, Macie)

### Backend (Flask + Python)
- RESTful API for AWS integrations
- Security scanning and analysis
- DynamoDB and PostgreSQL for data storage
- Compliance monitoring and performance metrics

### Local Development Infrastructure
- **PostgreSQL**: Primary database for security findings
- **Redis**: Caching and session management
- **Grafana**: Data visualization and monitoring
- **Prometheus**: Metrics collection and alerting

### AWS Infrastructure (Terraform)
- **Lambda**: Security scanner function (IAM, EC2, S3, Security Hub, GuardDuty, Config, Inspector, Macie)
- **DynamoDB**: Scan results storage
- **S3**: Static hosting and scan results archive
- **API Gateway**: REST API for triggering scans (9 endpoints)
- **GitHub Actions OIDC**: Secure CI/CD deployment

## 🔐 AWS Integrations

### Security Services
- **IAM Analysis**: User, role, and policy security scanning
- **EC2 Security**: Instance and security group analysis
- **S3 Security**: Bucket encryption and access control
- **Security Hub**: Centralized security findings
- **Config**: Compliance and configuration monitoring

### Required AWS Permissions
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iam:ListUsers",
        "iam:ListRoles",
        "iam:ListPolicies",
        "ec2:DescribeInstances",
        "ec2:DescribeSecurityGroups",
        "s3:ListBuckets",
        "s3:GetBucketEncryption",
        "securityhub:GetFindings",
        "config:GetComplianceSummaryByConfigRule"
      ],
      "Resource": "*"
    }
  ]
}
```

## 📊 Features

### Security Dashboard (Analyst Work Haven)
- Real-time security findings overview
- Ticket and case management for findings (triage, assign, track)
- Compliance status tracking
- Risk assessment and scoring
- Automated security recommendations

### AWS Service Analysis
- **IAM Security**: MFA enforcement, access key rotation
- **EC2 Security**: Encryption status, security group analysis
- **S3 Security**: Public access blocking, encryption verification
- **Network Security**: VPC configuration analysis

### Monitoring & Alerting
- Grafana dashboards for system metrics
- Prometheus metrics collection
- Custom security alerts
- Performance monitoring

### Compliance Tracking
- SOC2, PCI-DSS, HIPAA compliance
- Automated compliance scoring
- Regulatory reporting
- Audit trail management

## 🛠️ Development

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for frontend development)
- Python 3.11+ (for backend development)

### Frontend Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Backend Development
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run Flask development server
python backend/app.py

# Run tests
pytest
```

## 📁 Project Structure

```graphql
├── .github/              # GitHub configuration
│   ├── workflows/        # GitHub Actions workflows
│   │   ├── devsecops-scan.yml  # Security scanning pipeline
│   │   └── deploy.yml          # Deployment pipeline
│   └── dependabot.yml    # Automated dependency updates
├── backend/              # Flask API backend
│   ├── api/              # API endpoints
│   │   ├── aws_iam.py    # IAM security analysis
│   │   ├── aws_ec2.py    # EC2 security analysis
│   │   ├── aws_s3.py     # S3 security analysis
│   │   ├── aws_security_hub.py # Security Hub integration
│   │   ├── aws_config.py # Config compliance
│   │   ├── grafana.py    # Grafana integration
│   │   ├── dashboard.py  # Dashboard API
│   │   └── health.py     # Health check endpoint
│   ├── services/         # Business logic
│   │   ├── aws_service.py      # AWS SDK integration
│   │   ├── dynamodb_service.py # DynamoDB operations
│   │   ├── grafana_service.py  # Grafana API
│   │   └── database_service.py # Database operations
│   ├── sql/              # Database initialization
│   │   └── init.sql      # Database schema
│   └── app.py            # Flask application
├── config/               # Configuration files
│   ├── grafana/          # Grafana configuration
│   │   ├── provisioning/ # Auto-provisioning configs
│   │   └── dashboards/   # Custom dashboards
│   └── prometheus/       # Prometheus configuration
│       └── prometheus.yml # Prometheus config
├── DevSecOps/            # Security scanning and policies
│   ├── opa-policies/     # OPA policy files
│   │   ├── iam-policies.rego # IAM security policies
│   │   ├── security.rego # General security policies
│   │   ├── terraform.rego # Terraform policies
│   │   └── kubernetes.rego # Kubernetes policies
│   ├── .checkov.yml      # Checkov configuration
│   ├── .gitleaks.toml    # Gitleaks configuration
│   └── SECURITY.md       # Security policies
├── docs/                 # Documentation
│   ├── security/         # DevSecOps and security docs
│   │   ├── SCANNERS.md
│   │   └── CHECKOV_SKIP_RISK.md
│   ├── planning/         # Backlog and roadmap
│   │   └── GITHUB_ISSUES_BACKLOG.md
│   ├── onboarding/       # Setup and contribution
│   │   ├── TEAM_SETUP.md
│   │   ├── AWS-Workflow.md
│   │   └── CONTRIBUTING.md
│   └── CHANGELOG.md      # Project changelog
├── infra/                # Infrastructure as Code (Terraform)
│   ├── s3/               # S3 buckets (static hosting, scan results)
│   ├── dynamodb/         # DynamoDB table for scan results
│   ├── lambda/           # Lambda security scanner function
│   ├── api-gateway/      # API Gateway REST API
│   ├── github-actions/   # GitHub Actions OIDC for deployment
│   ├── main.tf           # Root Terraform configuration
│   └── README.md         # Infrastructure setup guide
├── k8s/                  # Kubernetes manifests
│   └── README.md         # Kubernetes deployment guide
├── scripts/              # Utility scripts
│   ├── setup.sh          # Setup script
│   └── create-iam-test-resources.sh
├── src/                  # React frontend
│   ├── components/       # Dashboard components (Dashboard, AWSIAMScan, EC2, S3, SecurityHub, GuardDuty, etc.)
│   │   ├── ui/           # Radix UI components
│   │   └── figma/        # Image components
│   ├── context/          # React context (ScanResults)
│   ├── services/         # API client and PDF export
│   ├── hooks/            # Custom React hooks
│   ├── guidelines/       # Development guidelines
│   ├── styles/           # CSS styles
│   ├── types/            # TypeScript types
│   ├── utils/            # Utilities
│   ├── App.tsx           # Main React app
│   ├── main.tsx          # React entry point
│   └── index.css         # Global styles
├── data/                 # Application data directory
├── logs/                 # Application logs directory
├── docker-compose.yml    # Docker orchestration with security scanners
├── Dockerfile           # Multi-stage container definition
├── Makefile             # DevSecOps scanning commands
├── requirements.txt     # Python dependencies
├── package.json         # Node.js dependencies
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite build configuration
└── env.example          # Environment variables template
```

## 🔧 Configuration

### Environment Variables
Copy `env.example` to `.env` and configure:

```env
# AWS Configuration
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1

# Database Configuration
DATABASE_URL=postgresql://postgres:password@db:5432/cybersecurity_db
REDIS_URL=redis://redis:6379/0

# Security Configuration
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
```

### Grafana Configuration
- Pre-configured datasources for Prometheus, PostgreSQL, Redis
- Custom dashboards for security metrics
- Automated provisioning

### Prometheus Configuration
- Application metrics collection
- System metrics monitoring
- Custom security metrics

## 🧪 Testing

### Run Tests
```bash
# Run all tests
docker-compose exec app pytest

# Run specific test file
docker-compose exec app pytest tests/test_aws_service.py

# Run with coverage
docker-compose exec app pytest --cov=backend
```

### Test Coverage
- Unit tests for all API endpoints
- Integration tests for AWS services
- End-to-end tests for critical workflows

## 📈 Performance

### Optimization
- Redis caching for frequently accessed data
- Database indexing for query performance
- Async processing for long-running tasks
- Connection pooling for database access

### Monitoring
- Application performance metrics
- System resource monitoring
- Database performance tracking
- API response time monitoring

## 🔒 Security

### Security Features
- JWT-based authentication
- Role-based access control
- API rate limiting
- Input validation and sanitization
- Secure credential management

### Best Practices
- Environment variable configuration
- Secure database connections
- HTTPS enforcement
- Security headers
- Audit logging

## 🚀 Deployment

### AWS Deployment (Terraform)
Deploy the security scanner to AWS using the infrastructure modules:

```bash
cd infra
terraform init
terraform plan
terraform apply
```

This deploys Lambda, DynamoDB, S3, API Gateway, and GitHub Actions OIDC. See [infra/README.md](infra/README.md) for details.

### Production Deployment
1. Use managed databases (RDS, ElastiCache)
2. Configure load balancers
3. Set up monitoring and alerting
4. Implement backup strategies
5. Configure security groups

### Scaling
- Horizontal scaling with multiple app instances
- Database read replicas
- CDN for static assets
- Auto-scaling based on metrics

## 📚 Documentation

- [Team Setup Guide](docs/onboarding/TEAM_SETUP.md) - Complete team onboarding
- [Security Scanning Guide](docs/security/SCANNERS.md) - DevSecOps scanning setup
- [AWS Workflow](docs/onboarding/AWS-Workflow.md) - AWS integration workflow
- [Contributing Guide](docs/onboarding/CONTRIBUTING.md) - How to contribute to the project
- [Security Policies](DevSecOps/SECURITY.md) - Security policies and practices
- [Infrastructure Guide](infra/README.md) - AWS infrastructure (Lambda, DynamoDB, S3, API Gateway)
- [Kubernetes Guide](k8s/README.md) - Kubernetes deployment guide

## 🤝 Contributing

Repository: **[github.com/AWS-IAM-Dashboard/IAM-Dashboard](https://github.com/AWS-IAM-Dashboard/IAM-Dashboard)** (GitHub Organization – clone and open PRs from branches; no fork required).

### Development Workflow
1. Clone the repo and create a feature branch
2. Implement changes
3. Add tests
4. Submit pull request (branch → main)
5. Code review
6. Merge to main

### Code Standards
- Python: PEP 8, Black formatting
- TypeScript: ESLint, Prettier
- Commits: Conventional commit messages
- Documentation: Inline comments and docstrings

## 📞 Support

### Getting Help
- Check documentation and inline comments
- Create GitHub issues for bugs
- Use GitHub discussions for questions
- Team communication channels

### Useful Resources
- [Docker Documentation](https://docs.docker.com/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [React Documentation](https://reactjs.org/)
- [AWS Security Best Practices](https://aws.amazon.com/security/security-resources/)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- AWS Security services for comprehensive cloud security
- Grafana for powerful data visualization
- React and TypeScript communities
- Open source security tools and libraries

---

**Ready to streamline your security team's workflow?** 🚀

Start with `./setup.sh` and centralize your vulnerability scanning and findings.
