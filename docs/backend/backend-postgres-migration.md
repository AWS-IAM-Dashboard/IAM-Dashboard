# Backend — PostgreSQL Migration & API Update

This document covers the three main backend improvements made to support local development
with PostgreSQL mock data instead of live AWS calls. Intended as a reference for the frontend team.

---

## 1. PostgreSQL Data Insertion

All resource data is seeded into PostgreSQL via `backend/sql/init.sql`, which runs automatically
when the `db` container starts. No manual setup is needed beyond `docker-compose up`.

### Tables and what they hold

| Table | Description |
|---|---|
| `iam_users` | IAM users with MFA, console access, admin access, and last activity |
| `iam_roles` | IAM roles with cross-account, external trust, and permission flags |
| `iam_policies` | IAM policies with wildcard and over-permissive flags |
| `iam_access_keys` | Access keys with status and last-used timestamp |
| `ec2_instances` | EC2 instances with state, type, and volume encryption flag |
| `ec2_security_groups` | Security groups with open-port flag |
| `ec2_volumes` | EBS volumes with encryption, state, and size |
| `s3_buckets` | S3 buckets with public access, encryption, versioning, and logging flags |
| `security_findings` | Cross-service security findings with severity and status |
| `compliance_status` | Per-framework compliance scores (SOC2, PCI_DSS, HIPAA) |
| `performance_metrics` | Generic performance metrics (CPU, memory, disk, response time) |

All tables are seeded with realistic mock data scoped to a placeholder account (`mock-account-01`) in `us-east-1`.

---

## 2. API Files — Updated to Read from PostgreSQL

All five AWS API files now use `DatabaseService` (SQLAlchemy over PostgreSQL) instead of
direct boto3 calls. Each file follows the same pattern: query the DB, aggregate the results,
and return a structured JSON response.

All endpoints accept query parameters only (no request body). All responses are `application/json`.

---

### `GET /v1/aws/iam`

**Query params:** `region` (string, optional), `scan_type` (`full` | `quick`, optional)

**Response shape:**
```json
{
  "users": {
    "total_users": 6,
    "users_with_mfa": 3,
    "users_without_mfa": 3,
    "inactive_users": 1,
    "users_with_admin_access": 1,
    "users_with_console_access": 5
  },
  "roles": {
    "total_roles": 5,
    "cross_account_roles": 2,
    "roles_with_excessive_permissions": 1,
    "unused_roles": 0,
    "roles_with_external_trust": 1
  },
  "policies": {
    "total_policies": 5,
    "inline_policies": 1,
    "managed_policies": 4,
    "policies_with_wildcards": 2,
    "overly_permissive_policies": 2
  },
  "access_keys": {
    "total_access_keys": 5,
    "active_access_keys": 4,
    "inactive_access_keys": 1,
    "old_access_keys": 2,
    "unused_access_keys": 0
  },
  "security_findings": [
    {
      "finding_id": "FINDING-003",
      "title": "IAM User Without MFA",
      "severity": "HIGH",
      "status": "NEW",
      "resource_type": "AWS::IAM::User",
      "resource_id": "dev-user-01"
    }
  ],
  "recommendations": [
    {
      "type": "MFA",
      "priority": "High",
      "description": "Enable MFA for all IAM users",
      "impact": "Reduces risk of unauthorized access from compromised credentials"
    }
  ]
}
```

---

### `GET /v1/aws/ec2`

**Query params:** `region` (string, optional), `instance_id` (string, optional)

**Response shape:**
```json
{
  "instances": {
    "total_instances": 5,
    "running_instances": 3,
    "stopped_instances": 2,
    "instances_without_encryption": 2
  },
  "security_groups": {
    "total_security_groups": 4,
    "security_groups_with_open_ports": 2
  },
  "volumes": {
    "total_volumes": 5,
    "encrypted_volumes": 3,
    "unencrypted_volumes": 2,
    "unattached_volumes": 1
  },
  "snapshots": {
    "total_snapshots": 0,
    "public_snapshots": 0,
    "private_snapshots": 0,
    "old_snapshots": 0,
    "snapshots_without_encryption": 0
  },
  "security_findings": [
    {
      "finding_id": "FINDING-002",
      "title": "EC2 Instance Without Encryption",
      "severity": "MEDIUM",
      "status": "NEW",
      "resource_type": "AWS::EC2::Instance",
      "resource_id": "i-0abc123def456"
    }
  ],
  "recommendations": [
    {
      "type": "Encryption",
      "priority": "High",
      "description": "Enable encryption for all EBS volumes",
      "impact": "Protects data at rest from unauthorized access"
    }
  ]
}
```

---

### `GET /v1/aws/s3`

**Query params:** `region` (string, optional), `bucket_name` (string, optional)

**Response shape:**
```json
{
  "buckets": {
    "total_buckets": 6,
    "public_buckets": 2,
    "private_buckets": 4,
    "buckets_without_encryption": 2,
    "buckets_without_versioning": 3,
    "buckets_without_logging": 3
  },
  "encryption": {
    "buckets_with_encryption": 4,
    "buckets_without_encryption": 2
  },
  "versioning": {
    "buckets_with_versioning": 3,
    "buckets_without_versioning": 3
  },
  "logging": {
    "buckets_with_logging": 3,
    "buckets_without_logging": 3
  },
  "security_findings": [
    {
      "finding_id": "FINDING-001",
      "title": "S3 Bucket Public Access",
      "severity": "HIGH",
      "status": "NEW",
      "resource_type": "AWS::S3::Bucket",
      "resource_id": "prod-data-bucket"
    }
  ],
  "recommendations": [
    {
      "type": "Public Access",
      "priority": "High",
      "description": "Block public access on 2 bucket(s)",
      "impact": "Prevents unauthorized access to sensitive data"
    }
  ]
}
```

---

### `GET /v1/aws/security-hub`

**Query params:** `severity` (`CRITICAL` | `HIGH` | `MEDIUM` | `LOW` | `INFORMATIONAL`, optional),
`status` (`NEW` | `NOTIFIED` | `SUPPRESSED` | `RESOLVED`, optional), `limit` (integer, default `100`)

**Response shape:**
```json
{
  "findings": [
    {
      "finding_id": "FINDING-004",
      "title": "Security Group Open to World",
      "description": "Security group allows inbound traffic from 0.0.0.0/0 on port 22",
      "severity": "CRITICAL",
      "status": "NEW",
      "resource_type": "AWS::EC2::SecurityGroup",
      "resource_id": "sg-example-id",
      "region": "us-east-1",
      "account_id": "mock-account-01",
      "resolved": false,
      "created_at": "2026-03-20T00:00:00"
    }
  ],
  "summary": {
    "total_findings": 5,
    "critical_findings": 1,
    "high_findings": 2,
    "medium_findings": 2,
    "low_findings": 0,
    "informational_findings": 0,
    "new_findings": 4,
    "resolved_findings": 0
  },
  "compliance": {
    "overall_score": 80.8,
    "frameworks": {
      "SOC2": { "score": 85.5, "status": "COMPLIANT" },
      "PCI_DSS": { "score": 65.0, "status": "NON_COMPLIANT" },
      "HIPAA": { "score": 92.0, "status": "COMPLIANT" }
    }
  },
  "recommendations": [
    {
      "type": "Critical Findings",
      "priority": "Critical",
      "description": "Remediate 1 open critical finding(s) immediately.",
      "impact": "Eliminates highest-risk exposure in your environment"
    }
  ]
}
```

---

### `GET /v1/aws/config`

**Query params:** `compliance_type` (`COMPLIANT` | `NON_COMPLIANT` | `NOT_APPLICABLE`, optional)

**Response shape:**
```json
{
  "compliance_summary": {
    "total_resources": 3,
    "compliant_resources": 2,
    "non_compliant_resources": 1,
    "not_applicable_resources": 0,
    "compliance_percentage": 66.7
  },
  "resource_inventory": {
    "total_resources": 34,
    "resource_types": {
      "IAM Users": 6,
      "IAM Roles": 5,
      "IAM Policies": 5,
      "IAM Access Keys": 5,
      "EC2 Instances": 5,
      "EC2 Security Groups": 4,
      "EC2 Volumes": 5,
      "S3 Buckets": 6
    }
  },
  "compliance_rules": {
    "total_rules": 3,
    "compliant_rules": 2,
    "non_compliant_rules": 1,
    "rules_by_framework": {
      "SOC2": { "total": 1, "compliant": 1, "non_compliant": 0 },
      "PCI_DSS": { "total": 1, "compliant": 0, "non_compliant": 1 },
      "HIPAA": { "total": 1, "compliant": 1, "non_compliant": 0 }
    }
  },
  "recommendations": [
    {
      "type": "Compliance Remediation",
      "priority": "High",
      "description": "Resolve 1 non-compliant resource(s) to improve your compliance score.",
      "impact": "Directly raises overall compliance percentage"
    }
  ]
}
```

---

## 3. app.py — New Endpoint Registration

`backend/app.py` was updated to register all five AWS endpoints as plain Flask routes following
the existing adapter pattern (`@app.get` calling `_normalize_resource_response`).

### Full endpoint list

| Method | Path | Handler |
|---|---|---|
| GET | `/v1/health` | `HealthResource` |
| GET | `/v1/metrics` | `MetricsResource` |
| GET | `/v1/grafana` | `GrafanaResource` |
| GET | `/v1/aws/iam` | `IAMResource` |
| GET | `/v1/aws/ec2` | `EC2Resource` |
| GET | `/v1/aws/s3` | `S3Resource` |
| GET | `/v1/aws/security-hub` | `SecurityHubResource` |
| GET | `/v1/aws/config` | `ConfigResource` |
| POST | `/v1/scan/<scanner_type>` | Lambda adapter |

### Important notes for frontend integration

- Base URL in Docker: `http://localhost:5001`
- All AWS endpoints are `GET` — no request body needed, use query parameters only
- All responses are `Content-Type: application/json`
- On error, all endpoints return `{ "error": "<message>" }` with an appropriate HTTP status code
- The `recommendations` array in every response is data-driven — it reflects actual findings
  in the database, so counts and descriptions will vary as data changes
