# Gitleaks Allowlist – Process and Record

This document describes how Gitleaks is used in this repo, what was allowlisted and why, and how to update the allowlist in the future.

## Configuration File

- **Path**: `DevSecOps/.gitleaks.toml`
- **CI**: Gitleaks runs in GitHub Actions (`devsecops-scan.yml`) and via `make gitleaks` (Docker).

## Documented Scan Results (Baseline)

Findings were categorized as follows.

### Acceptable (Allowlisted)

| Location / value | Reason |
|------------------|--------|
| `infra/lambda/**` | AWS SDK (botocore/boto3) example data; contains AWS example access key IDs and truncated JWT-like strings. Entire tree excluded via `exclude-dirs`. |
| `AKIAIOSFODNN7EXAMPLE`, `AKIA111111111EXAMPLE`, `AKIA222222222EXAMPLE`, `AKIAI44QH8DHBEXAMPLE` | AWS-documented example access key IDs; allowlisted via `[allowlist]` `stopwords`. |
| `eyJ2IjoiMSIsInMiOjEsImMiOi...` | Truncated example “JWT” in EC2 examples; non-sensitive. Allowlisted via `stopwords`. |
| `src/components/SecurityHub.tsx` | Mock/demo data using `resource_id: 'AKIAIOSFODNN7EXAMPLE'`. Allowlisted via `[allowlist]` `paths`. |

### Real Secrets

- **None** found. No AWS secret access keys, GitHub tokens, or other live secrets were detected.

## How to Update the Allowlist

Use this process when Gitleaks reports a finding that is **not** a real secret (e.g. test fixtures, example values, non-sensitive hashes).

### 1. Run Gitleaks and Capture Results

```bash
make gitleaks
# Or with Docker directly:
docker run --rm -v "$(pwd):/workspace:ro" -w /workspace \
  zricethezav/gitleaks:v8.18.0 detect \
  --config /workspace/DevSecOps/.gitleaks.toml \
  --source /workspace --no-git --report-format json
```

Review `scanner-results/gitleaks-results.json` (or the workflow artifact) for the rule ID, file path, and matched snippet.

### 2. Decide If the Finding Is Acceptable

- **Acceptable**: Test fixtures, example values (e.g. `*EXAMPLE`), non-sensitive hashes, mock/demo data, docs/spec examples.
- **Not acceptable**: Real API keys, passwords, tokens, or any credential that could grant access. These must be removed or rotated and never allowlisted.

### 3. Add to `DevSecOps/.gitleaks.toml`

Edit **one** of the following in `DevSecOps/.gitleaks.toml`:

- **`[gitleaks]`**
  - **`exclude-dirs`**: Add a directory path (e.g. `"some/test/fixtures"`) to skip entire trees.
  - **`exclude-patterns`**: Add a glob (e.g. `"**/fixtures/**"`) to skip by pattern.
  - **`exclude-files`**: Add a file path or glob to skip specific files.

- **`[allowlist]`** (for known safe **values** or **paths**)
  - **`stopwords`**: Add the **exact** string that was flagged (e.g. `"AKIAIOSFODNN7EXAMPLE"`). Use when the same safe value appears in multiple places.
  - **`paths`**: Add a regex for the file path (e.g. `'''src/components/.*Mock.*\.tsx'''`). Use when a whole file or path is safe (e.g. mocks).

Use the minimal change: prefer excluding a single path or adding one stopword over excluding broad patterns.

### 4. Re-run Gitleaks

```bash
make gitleaks
```

Confirm the finding is no longer reported and that CI would pass.

### 5. Document the Change

In this file (`DevSecOps/GITLEAKS_ALLOWLIST.md`):

- Under **Acceptable (Allowlisted)**, add a short row: location/value and reason.
- If you added a stopword or path, note it so future readers know why it’s there.

### 6. Resolve Real Secrets (Do Not Allowlist)

If the finding **is** a real secret:

1. Remove it from the repo (or replace with a placeholder/env reference).
2. Rotate the credential immediately (e.g. revoke and create a new key/token).
3. Do **not** add it to the allowlist.

## Quick Reference – Config Sections

| Goal | Section | Example |
|------|---------|--------|
| Skip whole directory | `[gitleaks]` → `exclude-dirs` | `"infra/lambda"` |
| Skip by glob | `[gitleaks]` → `exclude-patterns` | `"**/fixtures/**"` |
| Allow a specific safe value | `[allowlist]` → `stopwords` | `"AKIAIOSFODNN7EXAMPLE"` |
| Allow a file/path | `[allowlist]` → `paths` | `'''src/components/SecurityHub\.tsx'''` |

## Changelog

- **Initial**: Excluded `infra/lambda`; allowlisted AWS example access key IDs and truncated JWT example; allowlisted `src/components/SecurityHub.tsx` for mock data. Documented process in this file.
