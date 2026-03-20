# Project Structure

## Top-Level Layout

```
├── src/                  # React frontend (TypeScript)
├── backend/              # Flask API backend (Python)
├── infra/                # Terraform IaC modules
├── config/               # Runtime config (Grafana, Prometheus)
├── DevSecOps/            # Security policies and scanner config
├── docs/                 # Team and project documentation
├── scripts/              # Utility shell scripts
├── k8s/                  # Kubernetes manifests (future)
├── data/                 # App data directory (runtime)
├── logs/                 # App logs directory (runtime)
├── docker-compose.yml    # Full local dev stack
├── Dockerfile            # Backend container
├── Dockerfile.frontend   # Frontend container (Vite dev server)
└── Makefile              # DevSecOps scan commands
```

## Frontend — `src/`

```
src/
├── pages/            # Top-level route components (LandingPage, LoginPage, DashboardApp, AboutPage)
├── components/       # Feature components (Dashboard, AWSIAMScan, EC2Security, S3, etc.)
│   └── ui/           # Reusable Radix UI-based primitives
├── services/         # API client (api.ts) and utilities (pdfExport.ts)
├── context/          # React context providers (e.g. ScanResults)
├── hooks/            # Custom React hooks
├── types/            # Shared TypeScript types
├── utils/            # Helper functions
├── styles/           # Global CSS
├── guidelines/       # Dev guidelines docs
├── App.tsx           # Router setup
└── main.tsx          # Entry point
```

Routes: `/` (landing), `/about`, `/login`, `/app` (main dashboard), `/dashboard` → redirects to `/app`.

## Backend — `backend/`

```
backend/
├── api/              # Flask-RESTful Resource classes (one file per domain)
│   ├── dashboard.py
│   ├── aws_iam.py
│   ├── aws_ec2.py
│   ├── aws_s3.py
│   ├── aws_security_hub.py
│   ├── aws_config.py
│   ├── grafana.py
│   └── health.py
├── services/         # Business logic and AWS/DB integrations
│   ├── aws_service.py
│   ├── database_service.py
│   ├── dynamodb_service.py
│   └── grafana_service.py
├── sql/              # init.sql — PostgreSQL schema
└── app.py            # App factory (create_app), registers all resources
```

All API endpoints are registered under `/api/v1`. Each `api/` file exports one `Resource` class.

## Infrastructure — `infra/`

Terraform modules, each self-contained with `main.tf`, `variables.tf`, `outputs.tf`:
- `s3/` — static hosting + scan results archive
- `dynamodb/` — scan results table
- `lambda/` — security scanner function
- `api-gateway/` — REST API (9 endpoints)
- `github-actions/` — OIDC role for CI/CD

## DevSecOps — `DevSecOps/`

```
DevSecOps/
├── opa-policies/     # Rego policies (iam, security, terraform, kubernetes)
├── .checkov.yml      # Checkov skip rules and config
├── .gitleaks.toml    # Gitleaks scan config
└── SECURITY.md       # Security policies
```

Scan results output to `scanner-results/` (gitignored).

## Config — `config/`

```
config/
├── grafana/
│   ├── provisioning/datasources/   # Auto-provisioned datasources
│   └── provisioning/dashboards/    # Dashboard provisioning config
└── prometheus/
    └── prometheus.yml
```

## Conventions

- New backend endpoints: add a `Resource` class in `backend/api/`, register it in `backend/app.py`
- New frontend pages: add to `src/pages/`, add route in `src/App.tsx`
- Reusable UI components go in `src/components/ui/`
- Feature-level components go in `src/components/`
- AWS credentials are never hardcoded — always use environment variables or IAM roles
- Python: PEP 8, Black formatting, docstrings on all classes and public methods
- TypeScript: strict types, no `any` unless unavoidable, JSDoc on exported functions
