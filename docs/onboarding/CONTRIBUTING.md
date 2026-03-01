# Contributing to IAM Dashboard

We use the **organization repo** (no fork): clone, branch, push, open a PR to `main`. See [TEAM_SETUP.md](TEAM_SETUP.md) for setup.

---

## Workflow

1. **Branch from `main`:** `git checkout main && git pull origin main` then `git checkout -b feature/your-thing` (or `fix/...`, `docs/...`).
2. **Make changes** — follow the standards below and run `make scan` before pushing.
3. **Commit** with conventional messages: `feat: add X`, `fix: resolve Y`, `docs: update Z`.
4. **Push and open a PR:** `git push -u origin feature/your-thing`, then create a PR on GitHub (base: `main`). Link issues with "Fixes #123".

Keep PRs focused. Address review feedback promptly.

---

## Code standards

- **Backend (Python):** PEP 8, type hints where useful, docstrings for public APIs. Use Black; tests with pytest.
- **Frontend (TypeScript/React):** ESLint + Prettier, TypeScript strict. Tests with your team’s chosen stack.
- **Docs:** Update README and relevant `docs/` files when behavior or setup changes.

---

## Security

- Run **`make scan`** before submitting a PR (OPA, Checkov, Gitleaks).
- **Do not commit** secrets, keys, or tokens. Use `.env` (from `env.example`) and keep it out of version control.
- **Vulnerabilities:** Do not open a public issue. Report to the security team or maintainers privately.

---

## Bugs and features

- **Bugs:** Open an issue with a clear description, steps to reproduce, and environment (OS, Docker version).
- **Features:** Check existing issues first; describe the use case and how it fits the project.

---

## Review

- **Contributors:** Keep PRs small and scoped; respond to comments.
- **Reviewers:** Be constructive; focus on correctness, security, and clarity.

---

By contributing, you agree your contributions are licensed under the project license (see repository).
