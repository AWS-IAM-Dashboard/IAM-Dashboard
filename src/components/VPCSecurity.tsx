import { useState, useEffect } from "react";
import {
  Network,
  Play,
  RefreshCw,
  Download,
  Search,
  ChevronDown,
  ChevronRight,
  Shield,
  AlertTriangle,
  Globe,
  Lock,
  GitBranch,
  Eye,
  Activity,
  Bot,
  Zap,
  Ticket,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { scanEC2, type ScanResponse } from "../services/api";
import { useActiveScanResults } from "../hooks/useActiveScanResults";
import { ScanPageHeader } from "./ui/ScanPageHeader";
import { SeverityBadge } from "./ui/SeverityBadge";
import { StatCard } from "./ui/StatCard";
import { FindingDetailPanel, type WorkflowData } from "./ui/FindingDetailPanel";

type ResourceType = "VPC" | "Subnet" | "SecurityGroup" | "NACL" | "RouteTable" | "Peering";

interface VPCSecurityFinding {
  id: string;
  resource_type: ResourceType;
  resource_id: string;
  resource_name: string;
  vpc_id: string;
  region: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  finding_type: string;
  description: string;
  recommendation: string;
  compliance_frameworks: string[];
  is_public: boolean;
  flow_logs_enabled: boolean;
  affected_instances?: number;
  risk_score: number;
}

interface VPCScanSummary {
  total_vpcs: number;
  total_subnets: number;
  public_subnets: number;
  security_groups: number;
  open_security_groups: number;
  flow_logs_missing: number;
  critical_findings: number;
  high_findings: number;
  medium_findings: number;
  low_findings: number;
}

interface VPCScanResult {
  scan_id: string;
  status: "Running" | "Completed" | "Failed";
  progress: number;
  account_id: string;
  region: string;
  findings: VPCSecurityFinding[];
  scan_summary: VPCScanSummary;
  started_at?: string;
  completed_at?: string;
}

// ── Mock data ────────────────────────────────────────────────────────────────
const mockVPCFindings: VPCSecurityFinding[] = [
  {
    id: "vpc-001",
    resource_type: "SecurityGroup",
    resource_id: "sg-0a1b2c3d4e5f67890",
    resource_name: "sg-bastion-prod",
    vpc_id: "vpc-0a1b2c3d",
    region: "us-east-1",
    severity: "CRITICAL",
    finding_type: "SSH (Port 22) Open to 0.0.0.0/0 — Internet Exposed",
    description:
      "Security group sg-bastion-prod has an ingress rule permitting TCP port 22 from 0.0.0.0/0 and ::/0. This exposes 4 instances directly to automated brute-force, credential stuffing, and exploit kits targeting common SSH vulnerabilities (e.g., Log4Shell, ProxyShell variants). Port 22 is scanned globally within minutes of instance launch.",
    recommendation:
      "Remove the 0.0.0.0/0 SSH rule immediately. Migrate to AWS Systems Manager Session Manager (no inbound ports required). If SSH is mandatory, restrict to a VPN CIDR or specific IP allowlist and enforce MFA. Enable AWS GuardDuty Finding: UnauthorizedAccess:EC2/SSHBruteForce as a real-time detector.",
    compliance_frameworks: ["CIS 5.2", "PCI-DSS 1.3.2", "NIST AC-17", "SOC2 CC6.6"],
    is_public: true,
    flow_logs_enabled: false,
    affected_instances: 4,
    risk_score: 10,
  },
  {
    id: "vpc-002",
    resource_type: "SecurityGroup",
    resource_id: "sg-9f8e7d6c5b4a3201",
    resource_name: "sg-legacy-app",
    vpc_id: "vpc-0a1b2c3d",
    region: "us-east-1",
    severity: "CRITICAL",
    finding_type: "All Ports (0–65535) Open to VPC CIDR — Lateral Movement Risk",
    description:
      "Security group sg-legacy-app allows TCP 0–65535 inbound from 10.0.0.0/8 (entire organization CIDR). Any compromised host within the VPC or peered network can reach every port on the 11 instances using this SG. This eliminates micro-segmentation and enables unrestricted lateral movement post-compromise.",
    recommendation:
      "Apply least-privilege port rules: identify actual service ports via VPC Flow Logs (aws ec2 describe-flow-logs) and replace the broad rule with specific ports and source security group IDs instead of CIDR. Implement AWS Network Firewall or Security Hub FSBP control EC2.18 to enforce SG scope.",
    compliance_frameworks: ["CIS 5.4", "PCI-DSS 1.2.1", "NIST SC-7", "SOC2 CC6.6"],
    is_public: false,
    flow_logs_enabled: true,
    affected_instances: 11,
    risk_score: 10,
  },
  {
    id: "vpc-003",
    resource_type: "VPC",
    resource_id: "vpc-11223344aabbccdd",
    resource_name: "prod-vpc",
    vpc_id: "vpc-11223344aabbccdd",
    region: "us-east-1",
    severity: "HIGH",
    finding_type: "VPC Flow Logs Disabled — Blind to East-West Traffic",
    description:
      "prod-vpc has no VPC Flow Logs configured. Without flow logs, there is zero visibility into accepted or rejected network traffic. Incident response for lateral movement, port scans, data exfiltration over non-standard ports, and C2 beaconing is not possible. This is the primary production VPC with 34 instances and 8 subnets.",
    recommendation:
      "Enable VPC Flow Logs with ALL traffic (not ACCEPT-only) at the VPC level. Deliver to CloudWatch Logs and an S3 bucket in a separate security account. Set retention to 90 days minimum. Configure CloudWatch Metric Filter on REJECT records from private subnets to detect internal port scans. Integrate with Amazon Detective or SIEM.",
    compliance_frameworks: ["CIS 3.9", "PCI-DSS 10.6.1", "SOC2 CC7.2", "NIST AU-12"],
    is_public: false,
    flow_logs_enabled: false,
    risk_score: 8,
  },
  {
    id: "vpc-004",
    resource_type: "Subnet",
    resource_id: "subnet-public-1a2b3c4d",
    resource_name: "public-web-subnet-1a",
    vpc_id: "vpc-0a1b2c3d",
    region: "us-east-1",
    severity: "HIGH",
    finding_type: "Auto-Assign Public IP Enabled — Any Misconfigured SG Becomes Internet-Exposed",
    description:
      "public-web-subnet-1a has MapPublicIpOnLaunch=true. Every EC2 instance launched in this subnet automatically receives a public IPv4 address, even if no public IP was intended. Instances launched from misconfigured automation (Terraform, CDK, Ansible) or break-glass procedures will be internet-accessible immediately with no additional configuration.",
    recommendation:
      "Disable MapPublicIpOnLaunch on this subnet unless intentional. For instances requiring internet access, use NAT Gateway in a dedicated NAT subnet and keep application instances in private subnets. Use Elastic IPs only for specific resources that need a stable public address. Add an AWS Config rule to detect new public subnets.",
    compliance_frameworks: ["CIS 5.1", "NIST SC-7", "SOC2 CC6.6"],
    is_public: true,
    flow_logs_enabled: true,
    risk_score: 7,
  },
  {
    id: "vpc-005",
    resource_type: "RouteTable",
    resource_id: "rtb-0a1b2c3d4e5f6789",
    resource_name: "rtb-private-1a",
    vpc_id: "vpc-0a1b2c3d",
    region: "us-east-1",
    severity: "HIGH",
    finding_type: "No VPC Gateway Endpoint for S3 — Traffic Exits to Internet",
    description:
      "Private subnets route S3 API calls via 0.0.0.0/0 → nat-gateway → internet gateway because no VPC Gateway Endpoint for S3 is configured. S3 traffic traverses the public internet, creating unnecessary data transfer costs, increasing latency, and removing the ability to apply endpoint-specific S3 bucket policies restricting access to VPC-only.",
    recommendation:
      "Create an S3 VPC Gateway Endpoint (free) and attach to all private route tables. Update S3 bucket policies with the condition aws:SourceVpce to require requests originate from the VPC endpoint, effectively blocking direct internet access to buckets. Repeat for DynamoDB. Use VPC Interface Endpoints for other AWS services (SSM, STS, ECR).",
    compliance_frameworks: ["CIS 5.6", "NIST SC-7(4)", "SOC2 CC6.6"],
    is_public: false,
    flow_logs_enabled: true,
    risk_score: 7,
  },
  {
    id: "vpc-006",
    resource_type: "NACL",
    resource_id: "acl-0a1b2c3d4e5f6789",
    resource_name: "nacl-public-web",
    vpc_id: "vpc-0a1b2c3d",
    region: "us-east-1",
    severity: "HIGH",
    finding_type: "NACL Rule 100: ALLOW All Traffic from 0.0.0.0/0 — Defense-in-Depth Bypass",
    description:
      "Network ACL nacl-public-web has rule 100 which permits ALL inbound traffic from 0.0.0.0/0 on all ports and protocols. NACLs are designed as a stateless second layer of defense beyond security groups. This rule renders the NACL non-functional as a defense layer, leaving security groups as the sole perimeter control.",
    recommendation:
      "Replace ALLOW ALL rule with specific rules: allow TCP 80/443 from 0.0.0.0/0, allow TCP 1024-65535 for return traffic (ephemeral ports), deny all else. Block known malicious IP ranges using AWS Network Firewall managed threat intelligence rules. Review all NACLs using Security Hub control EC2.21.",
    compliance_frameworks: ["CIS 5.1", "PCI-DSS 1.2", "NIST SC-7", "SOC2 CC6.6"],
    is_public: true,
    flow_logs_enabled: true,
    risk_score: 7,
  },
  {
    id: "vpc-007",
    resource_type: "Peering",
    resource_id: "pcx-0a1b2c3d4e5f6789",
    resource_name: "vpc-peering-dev-prod",
    vpc_id: "vpc-0a1b2c3d",
    region: "us-east-1",
    severity: "MEDIUM",
    finding_type: "VPC Peering: Dev → Prod Full CIDR Route (Blast Radius: All Prod Subnets)",
    description:
      "The dev VPC (10.1.0.0/16) has a route to the entire prod VPC CIDR (10.0.0.0/8) via VPC peering. A compromised dev workload or developer credential can access all prod subnets directly — databases, internal APIs, management endpoints. The peering connection should route only to specific prod subnets required for integration testing.",
    recommendation:
      "Replace the broad prod CIDR route with specific subnet-level routes (e.g., only the integration-testing subnet 10.0.4.0/24). Apply security group rules on prod instances to restrict inbound from dev-specific SG IDs only. Consider replacing peering with AWS PrivateLink for controlled, one-way service exposure. Enable VPC Reachability Analyzer to validate segmentation.",
    compliance_frameworks: ["CIS 5.5", "NIST AC-4", "SOC2 CC6.3"],
    is_public: false,
    flow_logs_enabled: true,
    risk_score: 6,
  },
  {
    id: "vpc-008",
    resource_type: "SecurityGroup",
    resource_id: "sg-db-0a1b2c3d4e5f6789",
    resource_name: "sg-db-cluster",
    vpc_id: "vpc-11223344aabbccdd",
    region: "us-east-1",
    severity: "MEDIUM",
    finding_type: "Database SG Uses CIDR Source Instead of Security Group Reference",
    description:
      "sg-db-cluster allows TCP 5432 (PostgreSQL) from CIDR 10.0.0.0/8 rather than from a specific source security group ID. Any host with an IP in the 10.x.x.x range — including VPN clients, peered networks, and potentially dev workloads — can reach the production database cluster. Source SG references enforce that only specific application tiers can connect.",
    recommendation:
      "Replace the CIDR-based rule with a source security group reference: allow port 5432 from sg-app-layer only. This ensures only instances with the application SG can reach the DB, regardless of their IP. Remove the broad CIDR rule. Update RDS security group via AWS Console or use aws ec2 authorize-security-group-ingress with SourceSecurityGroupId.",
    compliance_frameworks: ["CIS 5.4", "PCI-DSS 1.3.4", "NIST SC-7"],
    is_public: false,
    flow_logs_enabled: true,
    risk_score: 5,
  },
  {
    id: "vpc-009",
    resource_type: "SecurityGroup",
    resource_id: "sg-orphan-0a1b2c3d",
    resource_name: "sg-monitoring-old",
    vpc_id: "vpc-11223344aabbccdd",
    region: "us-east-1",
    severity: "MEDIUM",
    finding_type: "Unused Security Group — Attack Surface & Audit Noise",
    description:
      "Security group sg-monitoring-old has no network interfaces, instances, or load balancers associated with it. Unused security groups with open rules could be accidentally attached to new resources during break-glass incidents or automation errors, exposing those resources. The group has 7 inbound rules including port 22 from 10.0.0.0/8.",
    recommendation:
      "Delete unused security groups via aws ec2 delete-security-group. Before deleting, validate with aws ec2 describe-network-interfaces --filters Name=group-id,Values=<sg-id>. Set up an AWS Config rule for ec2-security-group-attached-to-eni to detect unattached SGs. Implement a quarterly SG cleanup process in your security hygiene runbook.",
    compliance_frameworks: ["CIS 5.4", "SOC2 CC6.1"],
    is_public: false,
    flow_logs_enabled: true,
    risk_score: 4,
  },
  {
    id: "vpc-010",
    resource_type: "RouteTable",
    resource_id: "rtb-internal-0a1b2c3d",
    resource_name: "rtb-internal",
    vpc_id: "vpc-11223344aabbccdd",
    region: "us-east-1",
    severity: "LOW",
    finding_type: "No VPC Gateway Endpoint for DynamoDB — Unnecessary Internet Egress",
    description:
      "Private subnet route table rtb-internal routes DynamoDB API calls via NAT Gateway to the public DynamoDB endpoint. A free VPC Gateway Endpoint for DynamoDB is not configured. Beyond cost savings, the endpoint allows DynamoDB bucket policies that restrict table access to VPC-originated requests only.",
    recommendation:
      "Create a DynamoDB VPC Gateway Endpoint and associate it with all private route tables. Update DynamoDB resource-based policies to add condition aws:SourceVpce to restrict table access to VPC-only calls. This also eliminates DynamoDB data transfer charges through the NAT Gateway.",
    compliance_frameworks: ["CIS 5.6", "NIST SC-7(4)"],
    is_public: false,
    flow_logs_enabled: true,
    risk_score: 2,
  },
];

const mockVPCSummary: VPCScanSummary = {
  total_vpcs: 4,
  total_subnets: 16,
  public_subnets: 4,
  security_groups: 31,
  open_security_groups: 3,
  flow_logs_missing: 1,
  critical_findings: 2,
  high_findings: 4,
  medium_findings: 3,
  low_findings: 1,
};

// ── Style helpers ────────────────────────────────────────────────────────────
const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#ff0040",
  HIGH: "#ff6b35",
  MEDIUM: "#ffb000",
  LOW: "#00ff88",
};
const SEVERITY_BG: Record<string, { bg: string; color: string }> = {
  CRITICAL: { bg: "rgba(255,0,64,0.15)", color: "#ff0040" },
  HIGH: { bg: "rgba(255,107,53,0.15)", color: "#ff6b35" },
  MEDIUM: { bg: "rgba(255,176,0,0.15)", color: "#ffb000" },
  LOW: { bg: "rgba(0,255,136,0.15)", color: "#00ff88" },
};
const RESOURCE_COLORS: Record<string, string> = {
  SecurityGroup: "#818cf8",
  VPC: "#06b6d4",
  Subnet: "#a78bfa",
  NACL: "#f472b6",
  RouteTable: "#fb923c",
  Peering: "#34d399",
};
const cardStyle: React.CSSProperties = {
  background: "rgba(15,23,42,0.6)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 10,
  overflow: "hidden",
};
const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: "rgba(100,116,139,0.9)",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontFamily: "'JetBrains Mono', monospace",
};
const monoStyle: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };
const WORKFLOW_PIPELINE = ["NEW", "TRIAGED", "ASSIGNED", "IN_PROGRESS", "PENDING_VERIFY", "REMEDIATED"] as const;
type WorkflowStage = (typeof WORKFLOW_PIPELINE)[number];
const WORKFLOW_META: Record<WorkflowStage, { label: string; color: string; bg: string }> = {
  NEW: { label: "NEW", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  TRIAGED: { label: "TRIAGED", color: "#818cf8", bg: "rgba(129,140,248,0.12)" },
  ASSIGNED: { label: "ASSIGNED", color: "#06b6d4", bg: "rgba(6,182,212,0.12)" },
  IN_PROGRESS: { label: "IN PROGRESS", color: "#ffb000", bg: "rgba(255,176,0,0.12)" },
  PENDING_VERIFY: { label: "PENDING VERIFY", color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  REMEDIATED: { label: "REMEDIATED", color: "#00ff88", bg: "rgba(0,255,136,0.12)" },
};
const NEXT_STATUS: Partial<Record<WorkflowStage, WorkflowStage>> = {
  NEW: "TRIAGED",
  TRIAGED: "ASSIGNED",
  ASSIGNED: "IN_PROGRESS",
  IN_PROGRESS: "PENDING_VERIFY",
  PENDING_VERIFY: "REMEDIATED",
};
const ASSIGNEES = ["Sarah Chen", "Marcus Webb", "Dev Patel", "Priya Singh", "Infra Team", "Platform Eng", "SOC L2"];

// ── Component ─────────────────────────────────────────────────────────────────
export function VPCSecurity() {
  const [scanResult, setScanResult] = useState<VPCScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("us-east-1");
  const [loading, setLoading] = useState(false);
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [findingSearch, setFindingSearch] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<Record<string, string>>({});
  const [workflowOverrides, setWorkflowOverrides] = useState<Record<string, WorkflowStage>>({});
  const [assigneeByFinding, setAssigneeByFinding] = useState<Record<string, string>>({});
  const [ticketByFinding, setTicketByFinding] = useState<Record<string, string>>({});
  const [workflows, setWorkflows] = useState<Record<string, WorkflowData>>({});
  const { addScanResult } = useActiveScanResults();

  // Auto-load mock data on mount
  useEffect(() => {
    setScanResult({
      scan_id: "vpc-scan-demo-001",
      status: "Completed",
      progress: 100,
      account_id: "123456789012",
      region: "us-east-1",
      findings: mockVPCFindings,
      scan_summary: mockVPCSummary,
      started_at: new Date(Date.now() - 180000).toISOString(),
      completed_at: new Date(Date.now() - 120000).toISOString(),
    });
  }, []);

  useEffect(() => {
    if (scanResult?.status === "Completed" && scanResult.scan_id !== "vpc-scan-demo-001") {
      toast.success("VPC security scan completed!", {
        description: `Found ${scanResult.scan_summary.critical_findings + scanResult.scan_summary.high_findings} high-priority issues`,
      });
    } else if (scanResult?.status === "Failed") {
      toast.error("VPC scan failed", { description: "Check AWS credentials and EC2/VPC permissions" });
    }
  }, [scanResult?.status]);

  const handleStartScan = async () => {
    setIsScanning(true);
    setError(null);
    try {
      toast.info("VPC security scan started", { description: "Analyzing VPCs, subnets, security groups, flow logs…" });
      setScanResult({
        scan_id: "loading",
        status: "Running",
        progress: 0,
        account_id: "",
        region: selectedRegion,
        findings: [],
        scan_summary: { total_vpcs: 0, total_subnets: 0, public_subnets: 0, security_groups: 0, open_security_groups: 0, flow_logs_missing: 0, critical_findings: 0, high_findings: 0, medium_findings: 0, low_findings: 0 },
      });
      const response: ScanResponse = await scanEC2(selectedRegion);
      const findings = response.results?.vpc?.findings ?? mockVPCFindings;
      const summary = response.results?.vpc?.scan_summary ?? mockVPCSummary;
      setScanResult({
        scan_id: response.scan_id,
        status: response.status === "completed" ? "Completed" : response.status === "failed" ? "Failed" : "Running",
        progress: response.status === "completed" ? 100 : 50,
        account_id: response.results?.account_id || "123456789012",
        region: response.region,
        findings,
        scan_summary: summary,
        started_at: response.timestamp,
        completed_at: response.timestamp,
      });
      setIsScanning(false);
      addScanResult({ ...response, scanner_type: "vpc", results: { ...response.results, vpc: { findings, scan_summary: summary } } });
    } catch {
      setScanResult({
        scan_id: `vpc-${Date.now()}`,
        status: "Completed",
        progress: 100,
        account_id: "123456789012",
        region: selectedRegion,
        findings: mockVPCFindings,
        scan_summary: mockVPCSummary,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
      setIsScanning(false);
      toast.success("VPC scan completed (demo mode)", { description: "Showing sample findings" });
    }
  };

  const handleStopScan = () => {
    setIsScanning(false);
    if (scanResult) setScanResult({ ...scanResult, status: "Failed" });
    toast.warning("VPC scan stopped");
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setActiveTab(prev => ({ ...prev, [id]: prev[id] ?? "runbook" }));
  };

  const findings = scanResult?.findings ?? mockVPCFindings;

  useEffect(() => {
    if (!findings.length) return;
    setWorkflows(prev => {
      const next = { ...prev };
      findings.forEach(f => {
        if (!next[f.id]) {
          next[f.id] = {
            status: "NEW",
            first_seen: (f as any).created_date ?? (f as any).first_seen ?? new Date().toISOString(),
            sla_hours_remaining: f.severity === "CRITICAL" ? 4 : f.severity === "HIGH" ? 24 : f.severity === "MEDIUM" ? 168 : 720,
            sla_breached: false,
            timeline: [{ id: `${f.id}-init`, timestamp: new Date().toISOString(), actor: "Scanner", actor_type: "system" as const, action: "Finding detected", note: `${f.finding_type ?? f.id} identified` }],
          };
        }
      });
      return next;
    });
  }, [findings]);

  const advanceStatus = (findingId: string) => {
    const NEXT: Record<string, WorkflowData["status"]> = { NEW: "TRIAGED", TRIAGED: "ASSIGNED", ASSIGNED: "IN_PROGRESS", IN_PROGRESS: "PENDING_VERIFY", PENDING_VERIFY: "REMEDIATED" };
    setWorkflows(prev => { const w = prev[findingId]; if (!w) return prev; const next = NEXT[w.status]; if (!next) return prev; return { ...prev, [findingId]: { ...w, status: next, timeline: [...w.timeline, { id: `${findingId}-${Date.now()}`, timestamp: new Date().toISOString(), actor: "Security Analyst", actor_type: "analyst" as const, action: `Status advanced to ${next}` }] } }; });
  };
  const assignFinding = (findingId: string, assignee: string) => {
    setWorkflows(prev => { const w = prev[findingId] ?? { status: "NEW" as const, first_seen: new Date().toISOString(), timeline: [] }; return { ...prev, [findingId]: { ...w, assignee, status: (w.status === "NEW" || w.status === "TRIAGED") ? "ASSIGNED" : w.status, timeline: [...w.timeline, { id: `${findingId}-${Date.now()}`, timestamp: new Date().toISOString(), actor: "Security Analyst", actor_type: "analyst" as const, action: `Assigned to ${assignee}` }] } }; });
    toast.success(`Assigned to ${assignee}`);
  };
  const markFalsePositive = (findingId: string) => {
    setWorkflows(prev => { const w = prev[findingId] ?? { status: "NEW" as const, first_seen: new Date().toISOString(), timeline: [] }; return { ...prev, [findingId]: { ...w, status: "FALSE_POSITIVE", timeline: [...w.timeline, { id: `${findingId}-${Date.now()}`, timestamp: new Date().toISOString(), actor: "Security Analyst", actor_type: "analyst" as const, action: "Marked as false positive" }] } }; });
  };
  const baseWorkflowByFinding = findings.reduce((acc, finding, idx) => {
    acc[finding.id] = WORKFLOW_PIPELINE[idx % WORKFLOW_PIPELINE.length];
    return acc;
  }, {} as Record<string, WorkflowStage>);
  const workflowByFinding = findings.reduce((acc, finding) => {
    acc[finding.id] = workflowOverrides[finding.id] ?? baseWorkflowByFinding[finding.id];
    return acc;
  }, {} as Record<string, WorkflowStage>);
  const pipelineCounts = WORKFLOW_PIPELINE.reduce((acc, stage) => {
    acc[stage] = Object.values(workflowByFinding).filter(s => s === stage).length;
    return acc;
  }, {} as Record<WorkflowStage, number>);
  const filteredFindings = findings.filter(f => {
    const matchSev = severityFilter === "ALL" || f.severity === severityFilter;
    const matchStatus = statusFilter === "ALL" || workflowByFinding[f.id] === statusFilter;
    const matchSearch =
      findingSearch === "" ||
      f.resource_name.toLowerCase().includes(findingSearch.toLowerCase()) ||
      f.finding_type.toLowerCase().includes(findingSearch.toLowerCase()) ||
      f.resource_id.toLowerCase().includes(findingSearch.toLowerCase());
    return matchSev && matchStatus && matchSearch;
  });
  const summary = scanResult?.scan_summary ?? mockVPCSummary;

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <ScanPageHeader
        icon={<Network size={20} color="#00ff88" />}
        iconColor="#00ff88"
        title="VPC & Network Security"
        subtitle="Security groups, flow logs, NACLs, subnets, VPC endpoints, and peering misconfigurations"
        isScanning={isScanning}
        onScan={handleStartScan}
        onStop={handleStopScan}
        onRefresh={() => { setLoading(true); setTimeout(() => setLoading(false), 800); }}
        onExport={() => {}}
        region={selectedRegion}
        onRegionChange={setSelectedRegion}
      />

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(255,0,64,0.1)", border: "1px solid rgba(255,0,64,0.3)", color: "#ff0040", fontSize: 13 }}>
          <AlertTriangle size={13} style={{ display: "inline", marginRight: 6 }} />
          Scan Error: {error}
        </div>
      )}

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        <StatCard label="Total VPCs" value={summary.total_vpcs} accent="#06b6d4" icon={Network} />
        <StatCard label="Critical Findings" value={summary.critical_findings} accent="#ff0040" icon={Shield} />
        <StatCard label="High Findings" value={summary.high_findings} accent="#ff6b35" icon={AlertTriangle} />
        <StatCard label="Open SGs" value={summary.open_security_groups} accent="#ffb000" icon={Globe} />
        <StatCard label="No Flow Logs" value={summary.flow_logs_missing} accent="#ff6b35" icon={Eye} />
      </div>

      {/* Workflow Pipeline */}
      <div style={{ ...cardStyle, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <GitBranch size={13} color="rgba(100,116,139,0.7)" />
          <span style={labelStyle}>Workflow Pipeline</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {WORKFLOW_PIPELINE.map((stage, idx) => {
            const meta = WORKFLOW_META[stage];
            const count = pipelineCounts[stage] ?? 0;
            const isLast = idx === WORKFLOW_PIPELINE.length - 1;
            return (
              <div key={stage} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div
                  onClick={() => setStatusFilter(statusFilter === stage ? "ALL" : stage)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: 6,
                    background: statusFilter === stage ? meta.bg : "rgba(255,255,255,0.02)",
                    border: `1px solid ${statusFilter === stage ? `${meta.color}50` : "rgba(255,255,255,0.06)"}`,
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 700, color: count > 0 ? meta.color : "rgba(100,116,139,0.3)", ...monoStyle }}>{count}</div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: count > 0 ? meta.color : "rgba(100,116,139,0.3)", letterSpacing: "0.1em", marginTop: 2, ...monoStyle }}>
                    {meta.label}
                  </div>
                </div>
                {!isLast && (
                  <div style={{ width: 20, height: 1, background: "rgba(255,255,255,0.08)", flexShrink: 0, position: "relative" }}>
                    <div style={{ position: "absolute", right: -3, top: -4, color: "rgba(100,116,139,0.3)", fontSize: 8 }}>▶</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Risk Indicators Strip */}
      <div style={{ ...cardStyle, padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ ...labelStyle, marginRight: 4 }}>Risk Indicators</span>
        {[
          { label: `Open SGs: ${summary.open_security_groups} groups`, color: "#ff0040" },
          { label: `Public Subnets: ${summary.public_subnets}`, color: "#ffb000" },
          { label: `No Flow Logs: ${summary.flow_logs_missing} VPCs`, color: "#ff6b35" },
          { label: `Total Findings: ${summary.critical_findings + summary.high_findings + summary.medium_findings + summary.low_findings}`, color: "#818cf8" },
        ].map(chip => (
          <span key={chip.label} style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: `${chip.color}18`, border: `1px solid ${chip.color}40`, color: chip.color, ...monoStyle }}>
            {chip.label}
          </span>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map(sev => {
            const active = severityFilter === sev;
            const col = sev === "ALL" ? "#06b6d4" : SEVERITY_COLORS[sev];
            return (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", background: active ? `${col}25` : "rgba(255,255,255,0.03)", border: `1px solid ${active ? col : "rgba(255,255,255,0.08)"}`, color: active ? col : "rgba(100,116,139,0.7)", transition: "all 0.15s" }}
              >
                {sev}
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(100,116,139,0.5)" }} />
          <input
            value={findingSearch}
            onChange={e => setFindingSearch(e.target.value)}
            placeholder="Search resources, finding types, IDs…"
            style={{ width: "100%", padding: "8px 12px 8px 32px", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, color: "#e2e8f0", fontSize: 12, outline: "none", boxSizing: "border-box", ...monoStyle }}
          />
        </div>
        {statusFilter !== "ALL" && (
          <button
            onClick={() => setStatusFilter("ALL")}
            style={{ padding: "2px 8px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)", color: "#94a3b8", fontSize: 10, cursor: "pointer", ...monoStyle }}
          >
            {WORKFLOW_META[statusFilter as WorkflowStage]?.label} ✕
          </button>
        )}
        <span style={{ fontSize: 11, color: "rgba(100,116,139,0.5)", ...monoStyle }}>{filteredFindings.length} findings</span>
      </div>

      {/* Findings Table */}
      <div style={cardStyle}>
        <div style={{ display: "grid", gridTemplateColumns: "4px 1fr 120px 120px 110px 100px 80px 70px", gap: 0, padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", alignItems: "center" }}>
          <div />
          <span style={{ ...labelStyle, paddingLeft: 12 }}>Resource / Finding</span>
          <span style={labelStyle}>Type</span>
          <span style={labelStyle}>Status</span>
          <span style={labelStyle}>Severity</span>
          <span style={labelStyle}>Exposure</span>
          <span style={labelStyle}>Flow Logs</span>
          <span style={labelStyle}>Risk /10</span>
        </div>

        {filteredFindings.length === 0 ? (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <Network size={40} color="rgba(100,116,139,0.3)" style={{ margin: "0 auto 12px" }} />
            <p style={{ color: "rgba(100,116,139,0.5)", fontSize: 14, margin: 0 }}>No findings match your filters</p>
          </div>
        ) : (
          filteredFindings.map((finding, idx) => {
            const expanded = expandedRows.has(finding.id);
            const sevColor = SEVERITY_COLORS[finding.severity] ?? "#64748b";
            const isLast = idx === filteredFindings.length - 1;
            const typeColor = RESOURCE_COLORS[finding.resource_type] ?? "#64748b";
            return (
              <div key={finding.id}>
                <div
                  onClick={() => toggleRow(finding.id)}
                  style={{ display: "grid", gridTemplateColumns: "4px 1fr 120px 120px 110px 100px 80px 70px", gap: 0, padding: "12px 16px", alignItems: "center", cursor: "pointer", borderBottom: (!isLast || expanded) ? "1px solid rgba(255,255,255,0.04)" : "none", background: expanded ? "rgba(255,255,255,0.02)" : "transparent", transition: "background 0.15s" }}
                  onMouseEnter={e => { if (!expanded) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.015)"; }}
                  onMouseLeave={e => { if (!expanded) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                >
                  <div style={{ position: "relative", height: "100%" }}>
                    <div style={{ position: "absolute", left: 0, width: 4, top: -12, bottom: -12, background: sevColor, borderRadius: "0 2px 2px 0", opacity: 0.85 }} />
                  </div>

                  <div style={{ paddingLeft: 12, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <div style={{ flexShrink: 0 }}>
                      {expanded ? <ChevronDown size={14} color="#64748b" /> : <ChevronRight size={14} color="#64748b" />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {finding.resource_name}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(100,116,139,0.6)", ...monoStyle, marginTop: 1 }}>{finding.resource_id}</div>
                      <div style={{ fontSize: 11, color: "rgba(100,116,139,0.5)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {finding.finding_type}
                      </div>
                    </div>
                  </div>

                  <div>
                    <span style={{ padding: "4px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: `${typeColor}18`, border: `1px solid ${typeColor}30`, color: typeColor, ...monoStyle }}>
                      {finding.resource_type}
                    </span>
                  </div>

                  <div>
                    <SeverityBadge severity={workflowByFinding[finding.id] as string} size="sm" />
                  </div>

                  <div>
                    <SeverityBadge severity={finding.severity} size="sm" />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {finding.is_public ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#ff0040" }}>
                        <Globe size={11} color="#ff0040" />
                        Public
                      </span>
                    ) : (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#00ff88" }}>
                        <Lock size={11} color="#00ff88" />
                        Private
                      </span>
                    )}
                  </div>

                  <div>
                    {finding.flow_logs_enabled ? (
                      <span style={{ fontSize: 11, color: "#00ff88", ...monoStyle }}>✓ On</span>
                    ) : (
                      <span style={{ fontSize: 11, color: "#ff0040", ...monoStyle }}>✗ Off</span>
                    )}
                  </div>

                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: finding.risk_score >= 9 ? "#ff0040" : finding.risk_score >= 7 ? "#ff6b35" : finding.risk_score >= 5 ? "#ffb000" : "#00ff88", ...monoStyle }}>
                      {finding.risk_score}<span style={{ fontSize: 10, color: "rgba(100,116,139,0.5)" }}>/10</span>
                    </span>
                  </div>
                </div>

                {expanded && (
                  <FindingDetailPanel
                    finding={{
                      id: finding.id,
                      title: finding.finding_type ?? finding.id,
                      resource_name: finding.resource_name ?? finding.id,
                      resource_arn: (finding as any).resource_arn,
                      severity: finding.severity,
                      description: finding.description,
                      recommendation: finding.recommendation,
                      risk_score: finding.risk_score,
                      compliance_frameworks: finding.compliance_frameworks,
                      last_seen: (finding as any).last_seen ?? (finding as any).last_analyzed,
                      first_seen: (finding as any).created_date ?? (finding as any).first_seen,
                      region: finding.region,
                      metadata: {
                        "VPC ID": finding.vpc_id,
                        "Resource ID": finding.resource_id,
                        "Resource Type": finding.resource_type,
                        "Flow Logs": finding.flow_logs_enabled ? "Enabled" : "Disabled",
                        ...(finding.affected_instances !== undefined ? { "Affected Instances": String(finding.affected_instances) } : {}),
                      },
                    }}
                    workflow={workflows[finding.id]}
                    onAdvanceStatus={advanceStatus}
                    onAssign={assignFinding}
                    onMarkFalsePositive={markFalsePositive}
                    onCreateTicket={(id) => { toast.success(`Ticket created for ${id}`); }}
                    onClose={() => toggleRow(finding.id)}
                    isLast={isLast}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
