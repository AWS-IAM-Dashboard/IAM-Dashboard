import { useState, useEffect } from "react";
import {
  Server,
  RefreshCw,
  Download,
  Play,
  ChevronDown,
  ChevronRight,
  Lock,
  Unlock,
  Globe,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { scanEC2, type ScanResponse } from "../services/api";
import { useScanResults } from "../context/ScanResultsContext";

interface EC2SecurityFinding {
  id: string;
  instance_id: string;
  instance_name: string;
  instance_type: string;
  region: string;
  vpc_id: string;
  subnet_id: string;
  security_groups: string[];
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  finding_type: string;
  description: string;
  recommendation: string;
  compliance_frameworks: string[];
  public_ip: string | null;
  state: string;
  launch_time: string;
  risk_score: number;
}

interface EC2ScanResult {
  scan_id: string;
  status: 'Running' | 'Completed' | 'Failed';
  progress: number;
  account_id: string;
  region: string;
  total_instances: number;
  findings: EC2SecurityFinding[];
  scan_summary: {
    running_instances: number;
    stopped_instances: number;
    critical_findings: number;
    high_findings: number;
    medium_findings: number;
    low_findings: number;
    publicly_accessible: number;
    unencrypted_volumes: number;
  };
  started_at?: string;
  completed_at?: string;
}

const mockFindings: EC2SecurityFinding[] = [
  { id: 'ec2-001', instance_id: 'i-0a1b2c3d4e5f67890', instance_name: 'web-server-prod', instance_type: 't3.medium', region: 'us-east-1', vpc_id: 'vpc-0a1b2c3d', subnet_id: 'subnet-public-1a', security_groups: ['sg-web-public'], severity: 'CRITICAL', finding_type: 'SSH Open to Internet (0.0.0.0/0)', description: 'Security group sg-web-public allows inbound SSH (port 22) from 0.0.0.0/0 and ::/0. This instance is publicly accessible on port 22 from any IP address worldwide.', recommendation: 'Remove 0.0.0.0/0 SSH rule. Use AWS Systems Manager Session Manager for bastion-free access. If SSH required, restrict to known CIDR ranges or VPN IP.', compliance_frameworks: ['CIS 5.2', 'PCI-DSS 1.3'], public_ip: '52.23.45.67', state: 'running', launch_time: '2024-01-01T00:00:00Z', risk_score: 10 },
  { id: 'ec2-002', instance_id: 'i-0b2c3d4e5f678901a', instance_name: 'bastion-host', instance_type: 't3.small', region: 'us-east-1', vpc_id: 'vpc-0a1b2c3d', subnet_id: 'subnet-public-1b', security_groups: ['sg-bastion'], severity: 'CRITICAL', finding_type: 'RDP Open to Internet (0.0.0.0/0)', description: 'Security group sg-bastion allows inbound RDP (port 3389) from 0.0.0.0/0. Windows RDP exposed to the internet is a common ransomware and brute-force attack vector.', recommendation: 'Block all public RDP access. Use AWS Systems Manager Fleet Manager or a VPN. If RDP required, restrict to specific IP ranges with MFA.', compliance_frameworks: ['CIS 5.3', 'PCI-DSS 1.3'], public_ip: '54.34.56.78', state: 'running', launch_time: '2023-11-01T00:00:00Z', risk_score: 10 },
  { id: 'ec2-003', instance_id: 'i-0c3d4e5f67890abc1', instance_name: 'prod-ec2-instance-profile', instance_type: 'c5.large', region: 'us-east-1', vpc_id: 'vpc-0a1b2c3d', subnet_id: 'subnet-private-1a', security_groups: ['sg-app-layer'], severity: 'CRITICAL', finding_type: 'Instance Profile with AdministratorAccess', description: 'EC2 instance role attached to 3 instances (web-server-prod, api-server-01, worker-node-03) has AdministratorAccess policy. Any process on these instances has full AWS account access.', recommendation: 'Replace AdministratorAccess with least-privilege IAM role scoped to specific services and resources needed. Use IAM Access Analyzer to generate minimal policy from CloudTrail.', compliance_frameworks: ['CIS 1.16', 'SOC2 CC6.3'], public_ip: null, state: 'running', launch_time: '2023-08-15T00:00:00Z', risk_score: 10 },
  { id: 'ec2-004', instance_id: 'i-0d4e5f6789abcdef0', instance_name: 'db-migration-01', instance_type: 'm5.xlarge', region: 'us-east-1', vpc_id: 'vpc-0a1b2c3d', subnet_id: 'subnet-private-1b', security_groups: ['sg-db'], severity: 'HIGH', finding_type: 'IMDSv1 Enabled (Credential Theft Risk)', description: 'EC2 instance metadata service v1 (IMDSv1) is enabled. IMDSv1 is vulnerable to SSRF attacks — a web application vulnerability can expose instance credentials via http://169.254.169.254.', recommendation: 'Enforce IMDSv2 by setting HttpTokens=required on the instance. Test application compatibility first, then enforce at EC2 launch template and SCP level.', compliance_frameworks: ['CIS 5.6', 'SOC2 CC6.1'], public_ip: null, state: 'running', launch_time: '2023-12-01T00:00:00Z', risk_score: 8 },
  { id: 'ec2-005', instance_id: 'i-0e5f6789abcdef012', instance_name: 'api-server-01', instance_type: 't3.large', region: 'us-east-1', vpc_id: 'vpc-0a1b2c3d', subnet_id: 'subnet-private-1a', security_groups: ['sg-api'], severity: 'HIGH', finding_type: 'EBS Volume Not Encrypted', description: 'Root EBS volume vol-0a1b2c3d4e5f6789 attached to api-server-01 is not encrypted. If the volume or snapshot is accessed directly, data is readable in plaintext.', recommendation: 'Enable EBS encryption by default in EC2 account settings. For existing unencrypted volumes: create encrypted snapshot, create encrypted volume from snapshot, swap root volume.', compliance_frameworks: ['CIS 2.2.1', 'PCI-DSS 3.4', 'HIPAA 164.312(a)(2)'], public_ip: null, state: 'running', launch_time: '2023-10-01T00:00:00Z', risk_score: 7 },
  { id: 'ec2-006', instance_id: 'i-0f6789abcdef01234', instance_name: 'reporting-svc', instance_type: 't3.small', region: 'us-east-1', vpc_id: 'vpc-0a1b2c3d', subnet_id: 'subnet-private-1b', security_groups: ['sg-reporting'], severity: 'HIGH', finding_type: 'AMI Age: 547 Days (Unpatched)', description: 'Instance reporting-svc is running from AMI ami-0a1b2c3d4e5f6789 launched 547 days ago. AMIs this old likely contain unpatched OS packages, kernel vulnerabilities, and EOL software.', recommendation: 'Create new AMI from latest Amazon Linux 2023 or Ubuntu 22.04 base. Use EC2 Image Builder pipeline for automated patching. Redeploy instance from new AMI.', compliance_frameworks: ['CIS 5.1', 'PCI-DSS 6.3'], public_ip: null, state: 'running', launch_time: '2022-07-01T00:00:00Z', risk_score: 7 },
  { id: 'ec2-007', instance_id: 'snap-0a1b2c3d4e5f6789a', instance_name: 'prod-db-snapshot', instance_type: 'N/A', region: 'us-east-1', vpc_id: 'N/A', subnet_id: 'N/A', security_groups: [], severity: 'CRITICAL', finding_type: 'Public EBS Snapshot', description: 'EBS snapshot snap-0a1b2c3d4e5f6789 is publicly shared — any AWS account can create a volume from this snapshot. Snapshot contains a production database volume taken 14 days ago.', recommendation: 'Immediately change snapshot permissions to private. Audit all public snapshots: aws ec2 describe-snapshots --owner-ids self --filters Name=attribute,Values=createVolumePermission. Enable AWS Config rule ec2-ebs-snapshot-public-restorable-check.', compliance_frameworks: ['CIS 2.2.3', 'PCI-DSS 3.4'], public_ip: null, state: 'available', launch_time: '2024-01-01T00:00:00Z', risk_score: 10 },
  { id: 'ec2-008', instance_id: 'i-0g789abcdef012345', instance_name: 'worker-node-03', instance_type: 'c5.2xlarge', region: 'us-east-1', vpc_id: 'vpc-0a1b2c3d', subnet_id: 'subnet-private-1c', security_groups: ['sg-worker'], severity: 'MEDIUM', finding_type: 'SSM Agent Not Running', description: 'Instance worker-node-03 does not have SSM Agent running or reachable. Cannot be managed via AWS Systems Manager — no patch baseline enforcement, no Session Manager access, no Inventory collection.', recommendation: 'Install and start SSM Agent. Attach AmazonSSMManagedInstanceCore policy to instance role. Verify VPC endpoints for SSM, SSMMessages, and EC2Messages are configured.', compliance_frameworks: ['CIS 5.1'], public_ip: null, state: 'running', launch_time: '2024-01-10T00:00:00Z', risk_score: 5 },
  { id: 'ec2-009', instance_id: 'i-0h89abcdef0123456', instance_name: 'legacy-app-01', instance_type: 't2.micro', region: 'us-east-1', vpc_id: 'vpc-0a1b2c3d', subnet_id: 'subnet-private-1a', security_groups: ['sg-legacy'], severity: 'MEDIUM', finding_type: 'Missing Required Tags', description: 'Instance legacy-app-01 is missing required tags: Environment, Owner, CostCenter, DataClassification. Untagged instances cannot be included in cost allocation, backup policies, or automated security controls.', recommendation: 'Apply required tags immediately. Enforce tagging via AWS Config rule required-tags or SCP requiring tags on EC2 launch. Use Tag Editor for bulk tagging.', compliance_frameworks: ['SOC2 CC1.4'], public_ip: null, state: 'running', launch_time: '2021-05-01T00:00:00Z', risk_score: 4 },
  { id: 'ec2-010', instance_id: 'i-0i9abcdef01234567', instance_name: 'temp-instance-07', instance_type: 't3.medium', region: 'us-east-1', vpc_id: 'vpc-0a1b2c3d', subnet_id: 'subnet-public-1c', security_groups: ['sg-all-open'], severity: 'HIGH', finding_type: 'Security Group: All Ports Open Internally', description: 'Security group sg-all-open attached to temp-instance-07 allows all TCP traffic (0-65535) from the VPC CIDR 10.0.0.0/8. Overly permissive internal rules enable lateral movement if any internal host is compromised.', recommendation: 'Replace the all-ports rule with specific port allowances. Apply micro-segmentation: each service should only receive traffic on its specific ports from specific sources.', compliance_frameworks: ['CIS 5.4', 'PCI-DSS 1.2'], public_ip: '54.90.12.34', state: 'running', launch_time: '2024-01-14T00:00:00Z', risk_score: 7 },
];

const mockScanSummary = { total_instances: 28, running_instances: 22, stopped_instances: 6, publicly_accessible: 4, unencrypted_volumes: 7, unrestricted_ssh: 2, unrestricted_rdp: 1, imdsv1_enabled: 9, missing_ssm: 5, critical_findings: 4, high_findings: 4, medium_findings: 2, low_findings: 0 };

// ---- Style helpers ----
const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#ff0040',
  HIGH: '#ff6b35',
  MEDIUM: '#ffb000',
  LOW: '#00ff88',
};

const SEVERITY_BG: Record<string, { bg: string; color: string }> = {
  CRITICAL: { bg: 'rgba(255,0,64,0.15)', color: '#ff0040' },
  HIGH: { bg: 'rgba(255,107,53,0.15)', color: '#ff6b35' },
  MEDIUM: { bg: 'rgba(255,176,0,0.15)', color: '#ffb000' },
  LOW: { bg: 'rgba(0,255,136,0.15)', color: '#00ff88' },
};

const cardStyle: React.CSSProperties = {
  background: 'rgba(15,23,42,0.6)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 10,
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: 'rgba(51,65,85,0.9)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  fontFamily: "'JetBrains Mono', monospace",
};

const monoStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
};

export function EC2Security() {
  const [scanResult, setScanResult] = useState<EC2ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState('us-east-1');
  const [loading, setLoading] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [findingSearch, setFindingSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { addScanResult } = useScanResults();

  // Load mock data on mount
  useEffect(() => {
    setScanResult({
      scan_id: 'ec2-scan-demo-456',
      status: 'Completed',
      progress: 100,
      account_id: '123456789012',
      region: 'us-east-1',
      total_instances: mockScanSummary.total_instances,
      findings: mockFindings,
      scan_summary: {
        running_instances: mockScanSummary.running_instances,
        stopped_instances: mockScanSummary.stopped_instances,
        critical_findings: mockScanSummary.critical_findings,
        high_findings: mockScanSummary.high_findings,
        medium_findings: mockScanSummary.medium_findings,
        low_findings: mockScanSummary.low_findings,
        publicly_accessible: mockScanSummary.publicly_accessible,
        unencrypted_volumes: mockScanSummary.unencrypted_volumes,
      },
      started_at: new Date(Date.now() - 240000).toISOString(),
      completed_at: new Date(Date.now() - 180000).toISOString(),
    });
  }, []);

  useEffect(() => {
    if (scanResult?.status === 'Completed' && scanResult.scan_id !== 'ec2-scan-demo-456') {
      toast.success('EC2 security scan completed!', {
        description: `Found ${scanResult.scan_summary.critical_findings + scanResult.scan_summary.high_findings} high-priority issues`,
      });
    } else if (scanResult?.status === 'Failed') {
      toast.error('EC2 scan failed', { description: 'Check AWS credentials and permissions' });
    }
  }, [scanResult?.status]);

  const handleStartScan = async () => {
    setIsScanning(true);
    setError(null);
    try {
      toast.info('EC2 security scan started', { description: 'Analyzing EC2 instances and security configurations...' });
      setScanResult({
        scan_id: 'loading',
        status: 'Running',
        progress: 0,
        account_id: '',
        region: selectedRegion,
        total_instances: 0,
        findings: [],
        scan_summary: { running_instances: 0, stopped_instances: 0, critical_findings: 0, high_findings: 0, medium_findings: 0, low_findings: 0, publicly_accessible: 0, unencrypted_volumes: 0 },
      });
      const response: ScanResponse = await scanEC2(selectedRegion);
      const transformedResult: EC2ScanResult = {
        scan_id: response.scan_id,
        status: response.status === 'completed' ? 'Completed' : response.status === 'failed' ? 'Failed' : 'Running',
        progress: response.status === 'completed' ? 100 : response.status === 'failed' ? 0 : 50,
        account_id: response.results?.account_id || 'N/A',
        region: response.region,
        total_instances: response.results?.instances?.total || 0,
        findings: response.results?.findings || [],
        scan_summary: {
          running_instances: response.results?.instances?.running || 0,
          stopped_instances: response.results?.instances?.stopped || 0,
          publicly_accessible: response.results?.instances?.public || 0,
          unencrypted_volumes: response.results?.instances?.unencrypted_volumes || 0,
          critical_findings: response.results?.instances?.public || 0,
          high_findings: response.results?.instances?.without_imdsv2 || 0,
          medium_findings: 0,
          low_findings: 0,
        },
        started_at: response.timestamp,
        completed_at: response.timestamp,
      };
      setScanResult(transformedResult);
      setIsScanning(false);
      addScanResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsScanning(false);
      toast.error('Failed to start EC2 scan', { description: err instanceof Error ? err.message : 'Unknown error' });
    }
  };

  const handleStopScan = () => {
    setIsScanning(false);
    if (scanResult) setScanResult({ ...scanResult, status: 'Failed' });
    toast.warning('EC2 scan stopped', { description: 'Security scan was interrupted' });
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const findings = scanResult?.findings ?? mockFindings;
  const filteredFindings = findings.filter(f => {
    const matchSev = severityFilter === 'ALL' || f.severity === severityFilter;
    const matchSearch = findingSearch === '' ||
      f.instance_name.toLowerCase().includes(findingSearch.toLowerCase()) ||
      f.finding_type.toLowerCase().includes(findingSearch.toLowerCase()) ||
      f.instance_id.toLowerCase().includes(findingSearch.toLowerCase());
    return matchSev && matchSearch;
  });

  const summary = scanResult?.scan_summary ?? {
    running_instances: mockScanSummary.running_instances,
    stopped_instances: mockScanSummary.stopped_instances,
    critical_findings: mockScanSummary.critical_findings,
    high_findings: mockScanSummary.high_findings,
    medium_findings: mockScanSummary.medium_findings,
    low_findings: mockScanSummary.low_findings,
    publicly_accessible: mockScanSummary.publicly_accessible,
    unencrypted_volumes: mockScanSummary.unencrypted_volumes,
  };
  const totalInstances = scanResult?.total_instances ?? mockScanSummary.total_instances;

  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Server size={22} color="#818cf8" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.01em' }}>EC2 &amp; Compute</h1>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(100,116,139,0.7)', marginTop: 2 }}>
              Instance security posture — exposed ports, unencrypted volumes, IMDSv1, instance profiles, and patch status
            </p>
          </div>
        </div>
        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={selectedRegion}
            onChange={e => setSelectedRegion(e.target.value)}
            style={{ ...monoStyle, background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#e2e8f0', padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}
          >
            <option value="us-east-1">us-east-1</option>
            <option value="us-west-2">us-west-2</option>
            <option value="eu-west-1">eu-west-1</option>
            <option value="ap-southeast-1">ap-southeast-1</option>
          </select>
          <button
            onClick={handleStartScan}
            disabled={isScanning}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7, background: isScanning ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.85)', border: '1px solid rgba(99,102,241,0.5)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: isScanning ? 'not-allowed' : 'pointer' }}
          >
            <Play size={13} />
            {isScanning ? 'Scanning...' : 'Run Scan'}
          </button>
          {isScanning && (
            <button
              onClick={handleStopScan}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7, background: 'rgba(255,0,64,0.2)', border: '1px solid rgba(255,0,64,0.4)', color: '#ff0040', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Stop
            </button>
          )}
          <button
            onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 800); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}
          >
            <Download size={13} />
            Export
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(255,0,64,0.1)', border: '1px solid rgba(255,0,64,0.3)', color: '#ff0040', fontSize: 13 }}>
          Scan Error: {error}
        </div>
      )}

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Instances', value: totalInstances, color: '#818cf8', sub: `${summary.running_instances} running · ${summary.stopped_instances} stopped` },
          { label: 'Critical Findings', value: summary.critical_findings, color: '#ff0040', sub: 'Immediate action required' },
          { label: 'High Findings', value: summary.high_findings, color: '#ff6b35', sub: 'Remediate within 7 days' },
          { label: 'Publicly Accessible', value: summary.publicly_accessible, color: '#ffb000', sub: 'Instances with public IP' },
          { label: 'Unencrypted Volumes', value: summary.unencrypted_volumes, color: '#ff6b35', sub: 'EBS volumes at risk' },
        ].map(card => (
          <div key={card.label} style={{ ...cardStyle, padding: '16px 18px' }}>
            <p style={{ ...labelStyle, margin: '0 0 8px' }}>{card.label}</p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: card.color, ...monoStyle, lineHeight: 1 }}>{card.value}</p>
            <p style={{ margin: '6px 0 0', fontSize: 11, color: 'rgba(100,116,139,0.6)' }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Risk Indicators Strip */}
      <div style={{ ...cardStyle, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ ...labelStyle, marginRight: 4 }}>Risk Indicators</span>
        {[
          { label: `SSH: ${mockScanSummary.unrestricted_ssh} exposed`, color: '#ff0040' },
          { label: `RDP: ${mockScanSummary.unrestricted_rdp} exposed`, color: '#ff0040' },
          { label: `IMDSv1: ${mockScanSummary.imdsv1_enabled} instances`, color: '#ffb000' },
          { label: `No SSM: ${mockScanSummary.missing_ssm} instances`, color: '#ff6b35' },
        ].map(chip => (
          <span key={chip.label} style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: `${chip.color}18`, border: `1px solid ${chip.color}40`, color: chip.color, ...monoStyle }}>
            {chip.label}
          </span>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => {
            const active = severityFilter === sev;
            const col = sev === 'ALL' ? '#818cf8' : SEVERITY_COLORS[sev];
            return (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", background: active ? `${col}25` : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? col : 'rgba(255,255,255,0.08)'}`, color: active ? col : 'rgba(100,116,139,0.7)', transition: 'all 0.15s' }}
              >
                {sev}
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(100,116,139,0.5)' }} />
          <input
            value={findingSearch}
            onChange={e => setFindingSearch(e.target.value)}
            placeholder="Search findings, instances, IDs..."
            style={{ width: '100%', padding: '7px 10px 7px 30px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, color: '#e2e8f0', fontSize: 12, outline: 'none', boxSizing: 'border-box', ...monoStyle }}
          />
        </div>
        <span style={{ fontSize: 11, color: 'rgba(100,116,139,0.5)', ...monoStyle }}>{filteredFindings.length} findings</span>
      </div>

      {/* Findings Table */}
      <div style={cardStyle}>
        {/* Table Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '4px 1fr 130px 100px 80px 80px 70px', gap: 0, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', alignItems: 'center' }}>
          <div />
          <span style={{ ...labelStyle, paddingLeft: 12 }}>Instance / Finding</span>
          <span style={labelStyle}>Type</span>
          <span style={labelStyle}>Severity</span>
          <span style={labelStyle}>Public IP</span>
          <span style={labelStyle}>Risk /10</span>
          <span style={labelStyle}>State</span>
        </div>

        {filteredFindings.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <Server size={40} color="rgba(100,116,139,0.3)" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'rgba(100,116,139,0.5)', fontSize: 14, margin: 0 }}>No findings match your filters</p>
          </div>
        ) : (
          filteredFindings.map((finding, idx) => {
            const expanded = expandedRows.has(finding.id);
            const sevColor = SEVERITY_COLORS[finding.severity] ?? '#64748b';
            const isLast = idx === filteredFindings.length - 1;
            return (
              <div key={finding.id}>
                {/* Row */}
                <div
                  onClick={() => toggleRow(finding.id)}
                  style={{ display: 'grid', gridTemplateColumns: '4px 1fr 130px 100px 80px 80px 70px', gap: 0, padding: '12px 16px', alignItems: 'center', cursor: 'pointer', position: 'relative', borderBottom: (!isLast || expanded) ? '1px solid rgba(255,255,255,0.04)' : 'none', background: expanded ? 'rgba(255,255,255,0.02)' : 'transparent', transition: 'background 0.15s' }}
                  onMouseEnter={e => { if (!expanded) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.015)'; }}
                  onMouseLeave={e => { if (!expanded) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                >
                  {/* Severity bar */}
                  <div style={{ position: 'relative', height: '100%' }}>
                    <div style={{ position: 'absolute', left: 0, width: 4, top: -12, bottom: -12, background: sevColor, borderRadius: '0 2px 2px 0', opacity: 0.85 }} />
                  </div>

                  {/* Instance info */}
                  <div style={{ paddingLeft: 12, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <div style={{ flexShrink: 0 }}>
                      {expanded ? <ChevronDown size={14} color="#64748b" /> : <ChevronRight size={14} color="#64748b" />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {finding.instance_name}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(100,116,139,0.6)', ...monoStyle, marginTop: 1 }}>{finding.instance_id}</div>
                      <div style={{ fontSize: 11, color: 'rgba(100,116,139,0.5)', marginTop: 2 }}>{finding.finding_type}</div>
                    </div>
                  </div>

                  {/* Instance type */}
                  <div style={{ fontSize: 12, color: '#94a3b8', ...monoStyle }}>{finding.instance_type}</div>

                  {/* Severity badge */}
                  <div>
                    <span style={{ padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700, background: SEVERITY_BG[finding.severity]?.bg ?? 'rgba(100,116,139,0.15)', color: sevColor, ...monoStyle }}>
                      {finding.severity}
                    </span>
                  </div>

                  {/* Public IP */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {finding.public_ip ? (
                      <span style={{ fontSize: 11, color: '#ff0040', ...monoStyle, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Globe size={11} color="#ff0040" />
                        {finding.public_ip}
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#00ff88' }}>
                        <Lock size={11} color="#00ff88" />
                        Private
                      </span>
                    )}
                  </div>

                  {/* Risk score */}
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: finding.risk_score >= 9 ? '#ff0040' : finding.risk_score >= 7 ? '#ff6b35' : finding.risk_score >= 5 ? '#ffb000' : '#00ff88', ...monoStyle }}>
                      {finding.risk_score}<span style={{ fontSize: 10, color: 'rgba(100,116,139,0.5)' }}>/10</span>
                    </span>
                  </div>

                  {/* State */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: finding.state === 'running' ? '#00ff88' : finding.state === 'available' ? '#818cf8' : '#64748b', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: finding.state === 'running' ? '#00ff88' : '#64748b', ...monoStyle }}>{finding.state}</span>
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded && (
                  <div style={{ padding: '0 16px 16px 36px', borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
                      {/* Left: description + recommendation */}
                      <div>
                        <p style={{ ...labelStyle, margin: '0 0 6px' }}>Description</p>
                        <p style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>{finding.description}</p>
                        <div style={{ marginTop: 12, padding: 12, borderRadius: 7, background: 'rgba(255,176,0,0.07)', border: '1px solid rgba(255,176,0,0.2)' }}>
                          <p style={{ ...labelStyle, color: 'rgba(255,176,0,0.8)', margin: '0 0 6px' }}>Recommendation</p>
                          <p style={{ fontSize: 12, color: '#fcd34d', lineHeight: 1.6, margin: 0 }}>{finding.recommendation}</p>
                        </div>
                      </div>
                      {/* Right: metadata + compliance */}
                      <div>
                        <p style={{ ...labelStyle, margin: '0 0 8px' }}>Instance Details</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11, ...monoStyle }}>
                          {[
                            ['VPC', finding.vpc_id],
                            ['Subnet', finding.subnet_id],
                            ['Launch Time', new Date(finding.launch_time).toLocaleDateString()],
                            ['Region', finding.region],
                          ].map(([k, v]) => (
                            <div key={k}>
                              <span style={{ color: 'rgba(100,116,139,0.6)' }}>{k}: </span>
                              <span style={{ color: '#94a3b8' }}>{v}</span>
                            </div>
                          ))}
                        </div>
                        {finding.security_groups.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <span style={{ ...labelStyle }}>Security Groups: </span>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                              {finding.security_groups.map(sg => (
                                <span key={sg} style={{ padding: '2px 7px', borderRadius: 4, background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.2)', color: '#818cf8', fontSize: 11, ...monoStyle }}>{sg}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {finding.compliance_frameworks.length > 0 && (
                          <div style={{ marginTop: 10 }}>
                            <p style={{ ...labelStyle, margin: '0 0 6px' }}>Compliance Frameworks</p>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {finding.compliance_frameworks.map(fw => (
                                <span key={fw} style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: 11, ...monoStyle }}>{fw}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Spin keyframes */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
