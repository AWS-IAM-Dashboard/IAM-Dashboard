# Tech Stack

## Frontend
- React 18 + TypeScript, built with Vite 6
- Routing: react-router-dom v7
- UI: Radix UI primitives + Tailwind CSS v4
- Charts: Recharts
- Animations: Motion (Framer Motion)
- Forms: react-hook-form
- Icons: lucide-react
- Notifications: sonner

## Backend
- Python 3.11+, Flask 3 with Flask-RESTful
- API prefix: `/api/v1`
- AWS SDK: boto3
- Databases: PostgreSQL (SQLAlchemy), Redis
- Monitoring: Prometheus client, structlog
- Testing: pytest, pytest-flask, pytest-cov
- Linting/formatting: flake8, black

## Infrastructure
- Container orchestration: Docker Compose (primary dev environment)
- IaC: Terraform (modules for Lambda, DynamoDB, S3, API Gateway, GitHub Actions OIDC)
- Monitoring stack: Grafana + Prometheus
- Email (local dev): MailHog

## DevSecOps
- OPA (Open Policy Agent) — policy validation
- Checkov — IaC security scanning
- Gitleaks — secret detection
- Policies live in `DevSecOps/opa-policies/`

---

## Common Commands

### Docker (primary workflow — no local Node/Python install needed)
```bash
docker-compose up -d          # Start all services
docker-compose logs -f        # Tail logs
docker-compose down           # Stop services
docker-compose exec app pytest  # Run backend tests inside container
```

### Frontend (local)
```bash
npm install
npm run dev      # Vite dev server (http://localhost:5173)
npm run build    # Production build
```

### Backend (local)
```bash
pip install -r requirements.txt
pip install -r requirements-postgres.txt  # Add PostgreSQL driver
python backend/app.py                     # Flask dev server (port 5000)
pytest                                    # Run tests
pytest --cov=backend                      # With coverage
black .                                   # Format code
flake8                                    # Lint
```

### Security Scans
```bash
make scan       # Run all scans (OPA + Checkov + Gitleaks)
make opa        # OPA policy validation only
make checkov    # Checkov IaC scan only
make gitleaks   # Secret detection only
```

### Terraform
```bash
cd infra
terraform init
terraform plan
terraform apply
```

## Environment Variables
Copy `env.example` to `.env`. Key vars:
- `VITE_API_GATEWAY_URL` — frontend API target (default: `http://localhost:5001`)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL`
- `SECRET_KEY`, `JWT_SECRET_KEY`

## Service Ports
| Service    | Port  |
|------------|-------|
| Frontend   | 3001  |
| Flask API  | 5001  |
| Grafana    | 3000  |
| Prometheus | 9090  |
| PostgreSQL | 5432  |
| Redis      | 6379  |
| MailHog UI | 8025  |
