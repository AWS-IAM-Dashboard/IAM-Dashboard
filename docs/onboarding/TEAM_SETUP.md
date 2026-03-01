# Team Setup Guide

Repo: **AWS-IAM-Dashboard/IAM-Dashboard**. Clone the org repo (no fork), work on branches, open PRs to `main`.

---

## Prerequisites

- Docker + Docker Compose
- Git
- Access to the [AWS-IAM-Dashboard](https://github.com/AWS-IAM-Dashboard) org (ask your lead if needed)

---

## Get running

```bash
git clone https://github.com/AWS-IAM-Dashboard/IAM-Dashboard.git
cd IAM-Dashboard
docker-compose up -d
```

**URLs:** Dashboard http://localhost:5001 · Grafana http://localhost:3000 (admin/admin) · Prometheus http://localhost:9090

**Pull latest:** `git checkout main && git pull origin main`

**Wrong remote?** Point `origin` at the org:  
`git remote set-url origin https://github.com/AWS-IAM-Dashboard/IAM-Dashboard.git`

### If you already have a fork + upstream

If your existing clone still points at a **personal fork** and an old `upstream`, you can switch it to the org repo without recloning:

```bash
# See your current remotes
git remote -v

# 1. Point origin at the org repo (required)
git remote set-url origin https://github.com/AWS-IAM-Dashboard/IAM-Dashboard.git

# 2. (Optional) Remove upstream if you no longer need it
git remote remove upstream  # ok if this fails because upstream doesn't exist

# 3. Make sure your local main tracks origin/main
git checkout main
git branch --set-upstream-to=origin/main main
git pull
```

After this, treat your local repo like any other org clone: create branches from `main`, push to `origin`, open PRs against `AWS-IAM-Dashboard/IAM-Dashboard`.

---

## Submitting changes (PRs)

> **Note:** `main` is a protected branch. Direct pushes to `main` are blocked; all changes must go through a pull request.

1. **Branch from main:** `git checkout main && git pull origin main` then `git checkout -b feature/your-thing`
2. **Commit and push:** `git add . && git commit -m "feat: what you did"` then `git push -u origin feature/your-thing`
3. **Open a PR** on GitHub: base `main`, compare your branch. Link issues with "Fixes #123".
4. **After merge:** `git checkout main && git pull origin main`

Don’t push to `main`; all changes go through a PR. See [CONTRIBUTING.md](CONTRIBUTING.md) for style and review.

---

## AWS (optional for local dev)

```bash
cp env.example .env
```

Set in `.env`: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION=us-east-1`. Needed only if you use AWS-backed features locally.

---

## Security scans

```bash
make scan
```

Runs OPA, Checkov, and Gitleaks. `make opa`, `make checkov`, `make gitleaks` for individual scans.

---

## Troubleshooting

- **Ports in use:** 5001, 3000, 5432, 6379, 9090 must be free.
- **Logs:** `docker-compose logs -f` or `docker-compose logs app`
- **Rebuild:** `docker-compose up --build -d`
- **Reset:** `docker-compose down -v`

---

More: [CONTRIBUTING.md](CONTRIBUTING.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [GITHUB_ISSUES_BACKLOG.md](../planning/GITHUB_ISSUES_BACKLOG.md)
