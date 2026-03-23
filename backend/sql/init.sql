-- Initialize Cybersecurity Dashboard Database
-- Creates all tables and seeds mock resource data for local access and development

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- Existing tables
-- ============================================================

CREATE TABLE IF NOT EXISTS security_findings (
    id SERIAL PRIMARY KEY,
    finding_id VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    severity VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'NEW',
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    region VARCHAR(50),
    account_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS compliance_status (
    id SERIAL PRIMARY KEY,
    framework VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    score FLOAT DEFAULT 0.0,
    last_assessed TIMESTAMP DEFAULT NOW(),
    findings_count INTEGER DEFAULT 0,
    region VARCHAR(50),
    account_id VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    value FLOAT NOT NULL,
    unit VARCHAR(50),
    timestamp TIMESTAMP DEFAULT NOW(),
    region VARCHAR(50),
    account_id VARCHAR(50)
);

-- ============================================================
-- IAM tables
-- ============================================================

CREATE TABLE IF NOT EXISTS iam_users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    has_console_access BOOLEAN DEFAULT FALSE,
    has_admin_access BOOLEAN DEFAULT FALSE,
    last_activity TIMESTAMP,
    region VARCHAR(50),
    account_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS iam_roles (
    id SERIAL PRIMARY KEY,
    role_id VARCHAR(255) UNIQUE NOT NULL,
    role_name VARCHAR(255) NOT NULL,
    is_cross_account BOOLEAN DEFAULT FALSE,
    has_external_trust BOOLEAN DEFAULT FALSE,
    has_excessive_permissions BOOLEAN DEFAULT FALSE,
    last_used TIMESTAMP,
    region VARCHAR(50),
    account_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS iam_policies (
    id SERIAL PRIMARY KEY,
    policy_id VARCHAR(255) UNIQUE NOT NULL,
    policy_name VARCHAR(255) NOT NULL,
    policy_type VARCHAR(50),
    has_wildcards BOOLEAN DEFAULT FALSE,
    is_overly_permissive BOOLEAN DEFAULT FALSE,
    account_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS iam_access_keys (
    id SERIAL PRIMARY KEY,
    key_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    last_used TIMESTAMP,
    account_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- EC2 tables
-- ============================================================

CREATE TABLE IF NOT EXISTS ec2_instances (
    id SERIAL PRIMARY KEY,
    instance_id VARCHAR(255) UNIQUE NOT NULL,
    state VARCHAR(50) NOT NULL,
    instance_type VARCHAR(50),
    has_encrypted_volumes BOOLEAN DEFAULT FALSE,
    region VARCHAR(50),
    account_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ec2_security_groups (
    id SERIAL PRIMARY KEY,
    sg_id VARCHAR(255) UNIQUE NOT NULL,
    sg_name VARCHAR(255) NOT NULL,
    has_open_ports BOOLEAN DEFAULT FALSE,
    region VARCHAR(50),
    account_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ec2_volumes (
    id SERIAL PRIMARY KEY,
    volume_id VARCHAR(255) UNIQUE NOT NULL,
    encrypted BOOLEAN DEFAULT FALSE,
    state VARCHAR(50),
    size_gb INTEGER,
    region VARCHAR(50),
    account_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- S3 table
-- ============================================================

CREATE TABLE IF NOT EXISTS s3_buckets (
    id SERIAL PRIMARY KEY,
    bucket_name VARCHAR(255) UNIQUE NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    has_encryption BOOLEAN DEFAULT FALSE,
    has_versioning BOOLEAN DEFAULT FALSE,
    has_logging BOOLEAN DEFAULT FALSE,
    region VARCHAR(50),
    account_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_security_findings_severity ON security_findings(severity);
CREATE INDEX IF NOT EXISTS idx_security_findings_status ON security_findings(status);
CREATE INDEX IF NOT EXISTS idx_security_findings_created_at ON security_findings(created_at);
CREATE INDEX IF NOT EXISTS idx_compliance_status_framework ON compliance_status(framework);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_iam_users_account ON iam_users(account_id);
CREATE INDEX IF NOT EXISTS idx_ec2_instances_state ON ec2_instances(state);
CREATE INDEX IF NOT EXISTS idx_s3_buckets_account ON s3_buckets(account_id);

-- ============================================================
-- Views
-- ============================================================

CREATE OR REPLACE VIEW security_findings_summary AS
SELECT
    severity,
    status,
    COUNT(*) AS count,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600) AS avg_resolution_hours
FROM security_findings
GROUP BY severity, status;

CREATE OR REPLACE VIEW compliance_summary AS
SELECT
    framework,
    status,
    COUNT(*) AS resource_count,
    AVG(score) AS avg_score
FROM compliance_status
GROUP BY framework, status;

-- ============================================================
-- Mock seed data
-- ============================================================

-- Security findings
INSERT INTO security_findings (finding_id, title, description, severity, status, resource_type, resource_id, region, account_id) VALUES
('FINDING-001', 'S3 Bucket Public Access', 'S3 bucket has public read access enabled', 'HIGH', 'NEW', 'AWS::S3::Bucket', 'prod-data-bucket', 'us-east-1', '123456789012'),
('FINDING-002', 'EC2 Instance Without Encryption', 'EC2 instance has unencrypted EBS volumes', 'MEDIUM', 'NEW', 'AWS::EC2::Instance', 'i-0abc123def456', 'us-east-1', '123456789012'),
('FINDING-003', 'IAM User Without MFA', 'IAM user does not have MFA enabled', 'HIGH', 'NEW', 'AWS::IAM::User', 'dev-user-01', 'us-east-1', '123456789012'),
('FINDING-004', 'Security Group Open to World', 'Security group allows inbound traffic from 0.0.0.0/0 on port 22', 'CRITICAL', 'NEW', 'AWS::EC2::SecurityGroup', 'sg-0123456789', 'us-east-1', '123456789012'),
('FINDING-005', 'Access Key Not Rotated', 'IAM access key has not been rotated in over 90 days', 'MEDIUM', 'IN_PROGRESS', 'AWS::IAM::AccessKey', 'AKIA1234567890', 'us-east-1', '123456789012')
ON CONFLICT (finding_id) DO NOTHING;

-- Compliance status
INSERT INTO compliance_status (framework, resource_id, status, score, findings_count, region, account_id) VALUES
('SOC2', 'account-123456789012', 'COMPLIANT', 85.5, 2, 'us-east-1', '123456789012'),
('PCI_DSS', 'account-123456789012', 'NON_COMPLIANT', 65.0, 5, 'us-east-1', '123456789012'),
('HIPAA', 'account-123456789012', 'COMPLIANT', 92.0, 1, 'us-east-1', '123456789012')
ON CONFLICT DO NOTHING;

-- Performance metrics
INSERT INTO performance_metrics (metric_name, value, unit, region, account_id) VALUES
('cpu_usage', 45.2, 'percent', 'us-east-1', '123456789012'),
('memory_usage', 67.8, 'percent', 'us-east-1', '123456789012'),
('disk_usage', 23.4, 'percent', 'us-east-1', '123456789012'),
('response_time', 125.6, 'milliseconds', 'us-east-1', '123456789012')
ON CONFLICT DO NOTHING;

-- IAM users
INSERT INTO iam_users (user_id, username, mfa_enabled, has_console_access, has_admin_access, last_activity, region, account_id) VALUES
('AIDA1111111111111111', 'admin-user', TRUE, TRUE, TRUE, NOW() - INTERVAL '1 day', 'us-east-1', '123456789012'),
('AIDA2222222222222222', 'dev-user-01', FALSE, TRUE, FALSE, NOW() - INTERVAL '3 days', 'us-east-1', '123456789012'),
('AIDA3333333333333333', 'dev-user-02', FALSE, TRUE, FALSE, NOW() - INTERVAL '10 days', 'us-east-1', '123456789012'),
('AIDA4444444444444444', 'ci-service-user', TRUE, FALSE, FALSE, NOW() - INTERVAL '1 hour', 'us-east-1', '123456789012'),
('AIDA5555555555555555', 'readonly-analyst', TRUE, TRUE, FALSE, NOW() - INTERVAL '2 days', 'us-east-1', '123456789012'),
('AIDA6666666666666666', 'old-contractor', FALSE, TRUE, FALSE, NOW() - INTERVAL '95 days', 'us-east-1', '123456789012')
ON CONFLICT (user_id) DO NOTHING;

-- IAM roles
INSERT INTO iam_roles (role_id, role_name, is_cross_account, has_external_trust, has_excessive_permissions, last_used, region, account_id) VALUES
('AROA1111111111111111', 'EC2InstanceRole', FALSE, FALSE, FALSE, NOW() - INTERVAL '2 hours', 'us-east-1', '123456789012'),
('AROA2222222222222222', 'LambdaExecutionRole', FALSE, FALSE, FALSE, NOW() - INTERVAL '30 minutes', 'us-east-1', '123456789012'),
('AROA3333333333333333', 'CrossAccountAuditRole', TRUE, FALSE, FALSE, NOW() - INTERVAL '5 days', 'us-east-1', '123456789012'),
('AROA4444444444444444', 'ExternalVendorRole', TRUE, TRUE, FALSE, NOW() - INTERVAL '15 days', 'us-east-1', '123456789012'),
('AROA5555555555555555', 'AdminRole', FALSE, FALSE, TRUE, NOW() - INTERVAL '1 day', 'us-east-1', '123456789012')
ON CONFLICT (role_id) DO NOTHING;

-- IAM policies
INSERT INTO iam_policies (policy_id, policy_name, policy_type, has_wildcards, is_overly_permissive, account_id) VALUES
('POL-0000000001', 'S3ReadOnlyPolicy', 'managed', FALSE, FALSE, '123456789012'),
('POL-0000000002', 'EC2FullAccessPolicy', 'managed', TRUE, TRUE, '123456789012'),
('POL-0000000003', 'LambdaInvokePolicy', 'managed', FALSE, FALSE, '123456789012'),
('POL-0000000004', 'InlineAdminPolicy', 'inline', TRUE, TRUE, '123456789012'),
('POL-0000000005', 'DynamoDBReadPolicy', 'managed', FALSE, FALSE, '123456789012')
ON CONFLICT (policy_id) DO NOTHING;

-- IAM access keys
INSERT INTO iam_access_keys (key_id, username, status, last_used, account_id) VALUES
('AKIA1111111111111111', 'admin-user', 'Active', NOW() - INTERVAL '1 day', '123456789012'),
('AKIA2222222222222222', 'dev-user-01', 'Active', NOW() - INTERVAL '3 days', '123456789012'),
('AKIA3333333333333333', 'ci-service-user', 'Active', NOW() - INTERVAL '1 hour', '123456789012'),
('AKIA4444444444444444', 'old-contractor', 'Active', NOW() - INTERVAL '95 days', '123456789012'),
('AKIA5555555555555555', 'dev-user-02', 'Inactive', NOW() - INTERVAL '60 days', '123456789012')
ON CONFLICT (key_id) DO NOTHING;

-- EC2 instances
INSERT INTO ec2_instances (instance_id, state, instance_type, has_encrypted_volumes, region, account_id) VALUES
('i-0aaa111111111111a', 'running', 't3.medium', TRUE, 'us-east-1', '123456789012'),
('i-0bbb222222222222b', 'running', 't3.large', FALSE, 'us-east-1', '123456789012'),
('i-0ccc333333333333c', 'stopped', 't3.small', TRUE, 'us-east-1', '123456789012'),
('i-0ddd444444444444d', 'running', 'm5.xlarge', FALSE, 'us-east-1', '123456789012'),
('i-0eee555555555555e', 'stopped', 't3.micro', TRUE, 'us-east-1', '123456789012')
ON CONFLICT (instance_id) DO NOTHING;

-- EC2 security groups
INSERT INTO ec2_security_groups (sg_id, sg_name, has_open_ports, region, account_id) VALUES
('sg-0aaa111111111111', 'web-tier-sg', TRUE, 'us-east-1', '123456789012'),
('sg-0bbb222222222222', 'app-tier-sg', FALSE, 'us-east-1', '123456789012'),
('sg-0ccc333333333333', 'db-tier-sg', FALSE, 'us-east-1', '123456789012'),
('sg-0ddd444444444444', 'bastion-sg', TRUE, 'us-east-1', '123456789012')
ON CONFLICT (sg_id) DO NOTHING;

-- EC2 volumes
INSERT INTO ec2_volumes (volume_id, encrypted, state, size_gb, region, account_id) VALUES
('vol-0aaa111111111111', TRUE, 'in-use', 50, 'us-east-1', '123456789012'),
('vol-0bbb222222222222', FALSE, 'in-use', 100, 'us-east-1', '123456789012'),
('vol-0ccc333333333333', TRUE, 'in-use', 200, 'us-east-1', '123456789012'),
('vol-0ddd444444444444', FALSE, 'available', 50, 'us-east-1', '123456789012'),
('vol-0eee555555555555', TRUE, 'in-use', 30, 'us-east-1', '123456789012')
ON CONFLICT (volume_id) DO NOTHING;

-- S3 buckets
INSERT INTO s3_buckets (bucket_name, is_public, has_encryption, has_versioning, has_logging, region, account_id) VALUES
('prod-data-bucket', TRUE, FALSE, TRUE, FALSE, 'us-east-1', '123456789012'),
('prod-logs-bucket', FALSE, TRUE, TRUE, TRUE, 'us-east-1', '123456789012'),
('dev-artifacts-bucket', FALSE, TRUE, FALSE, FALSE, 'us-east-1', '123456789012'),
('static-website-assets', TRUE, FALSE, FALSE, FALSE, 'us-east-1', '123456789012'),
('backup-storage-bucket', FALSE, TRUE, TRUE, TRUE, 'us-east-1', '123456789012'),
('ml-training-data', FALSE, TRUE, FALSE, TRUE, 'us-east-1', '123456789012')
ON CONFLICT (bucket_name) DO NOTHING;
