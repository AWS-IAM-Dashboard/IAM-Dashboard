// Infrastructure Security — shared types

export type PostureStatus = "healthy" | "degraded" | "critical" | "unknown" | "mock";
export type FindingLifecycle = "open" | "triaged" | "in_progress" | "remediated" | "risk_accepted";
export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type Confidence = "HIGH" | "MEDIUM" | "LOW";

// ─── Shared finding primitives ────────────────────────────────────────────────

export interface EvidenceItem {
  id: string;
  type: "log_snippet" | "api_response" | "config_diff" | "network_capture" | "screenshot";
  label: string;
  content: string;
  collected_at: string;
  size_bytes?: number;
}

export interface TimelineItem {
  id: string;
  timestamp: string;
  actor: string;
  actor_type: "system" | "engineer" | "automation";
  action: string;
  note?: string;
}

export interface InfraFinding {
  id: string;
  title: string;
  severity: Severity;
  confidence: Confidence;
  description: string;
  resource_id: string;
  resource_type: string;
  region: string;
  lifecycle: FindingLifecycle;
  created_at: string;
  sla_deadline: string;
  sla_breached: boolean;
  assignee?: string;
  mitre_technique?: string;
  remediation_steps: string[];
  evidence: EvidenceItem[];
  timeline: TimelineItem[];
  integration_deps: string[];  // API/IaC deps to wire this card
}

// ─── Edge Security ────────────────────────────────────────────────────────────

export interface WAFWebACL {
  id: string;
  name: string;
  region: string;
  associated_resource: string;
  resource_type: "CloudFront" | "API_GATEWAY" | "ALB" | "AppSync" | "UNASSOCIATED";
  rule_count: number;
  blocked_24h: number;
  allowed_24h: number;
  rate_limited_24h: number;
  status: PostureStatus;
  findings: InfraFinding[];
}

export interface CloudFrontDistribution {
  id: string;
  domain_name: string;
  origin: string;
  waf_acl_id: string | null;
  https_enforced: boolean;
  geo_restriction: boolean;
  access_logging: boolean;
  price_class: string;
  status: PostureStatus;
  findings: InfraFinding[];
}

export interface APIGatewayEndpoint {
  id: string;
  name: string;
  stage: string;
  type: "REST" | "HTTP" | "WebSocket";
  auth_type: "NONE" | "AWS_IAM" | "COGNITO" | "LAMBDA_AUTHORIZER" | "API_KEY";
  waf_attached: boolean;
  throttle_burst: number;
  throttle_rate: number;
  endpoint_type: "REGIONAL" | "EDGE" | "PRIVATE";
  status: PostureStatus;
  findings: InfraFinding[];
}

// ─── Network Security ─────────────────────────────────────────────────────────

export interface SecurityGroupFinding {
  id: string;
  sg_id: string;
  sg_name: string;
  vpc_id: string;
  direction: "INBOUND" | "OUTBOUND";
  protocol: string;
  port_range: string;
  source_cidr: string;
  severity: Severity;
  description: string;
  attached_resources: number;
  lifecycle: FindingLifecycle;
  created_at: string;
  sla_deadline: string;
  sla_breached: boolean;
  remediation_steps: string[];
}

export interface NACLIssue {
  id: string;
  nacl_id: string;
  vpc_id: string;
  rule_number: number;
  direction: "INBOUND" | "OUTBOUND";
  action: "ALLOW" | "DENY";
  protocol: string;
  port_range: string;
  cidr: string;
  severity: Severity;
  description: string;
}

export interface VPCFlowLogEntry {
  vpc_id: string;
  vpc_name: string;
  flow_logs_enabled: boolean;
  destination: string | null;
  destination_type: "S3" | "CloudWatch" | null;
  retention_days: number | null;
  coverage: PostureStatus;
}

// ─── Compute Security ─────────────────────────────────────────────────────────

export type PatchStatus = "current" | "behind_1_month" | "behind_3_months" | "critical" | "unknown";

export interface ComputeInstanceFinding {
  id: string;
  instance_id: string;
  instance_name: string;
  instance_type: string;
  region: string;
  az: string;
  public_ip: string | null;
  ssm_managed: boolean;
  imdsv2_required: boolean;
  ebs_encrypted: boolean;
  patch_status: PatchStatus;
  severity: Severity;
  top_finding: string;
  lifecycle: FindingLifecycle;
  created_at: string;
  sla_deadline: string;
  sla_breached: boolean;
  remediation_steps: string[];
}

export interface LambdaFinding {
  id: string;
  function_name: string;
  runtime: string;
  region: string;
  execution_role_arn: string;
  public_url: boolean;
  vpc_attached: boolean;
  env_vars_encrypted: boolean;
  severity: Severity;
  finding: string;
  lifecycle: FindingLifecycle;
  created_at: string;
  remediation_steps: string[];
}

// ─── Network Troubleshooting ──────────────────────────────────────────────────

export type ConnectivityResult = "reachable" | "blocked" | "filtered" | "unknown" | "timeout";

export interface ConnectivityHop {
  index: number;
  component: string;
  type: "ENI" | "SecurityGroup" | "NACL" | "RouteTable" | "InternetGateway" | "NATGateway" | "VPCPeering" | "TransitGateway";
  action: "ALLOW" | "DENY" | "ROUTE" | "FORWARD";
  detail: string;
}

export interface ConnectivityTest {
  id: string;
  source: string;
  source_type: "EC2" | "Lambda" | "ECS" | "External";
  destination: string;
  destination_type: "EC2" | "RDS" | "S3_Endpoint" | "External" | "Service";
  port: number;
  protocol: "TCP" | "UDP" | "ICMP";
  result: ConnectivityResult;
  hops: ConnectivityHop[];
  ran_at: string;
  duration_ms: number;
  blocking_component?: string;
  blocking_reason?: string;
}

export interface RouteEntry {
  destination: string;
  target: string;
  target_type: "igw" | "nat" | "pcx" | "vgw" | "local" | "tgw" | "blackhole" | "eni";
  state: "active" | "blackhole";
  vpc_id: string;
  route_table_id: string;
  subnet_ids: string[];
}

export interface DNSResolution {
  id: string;
  hostname: string;
  resolved_ips: string[];
  resolver: "VPC_DNS" | "Route53_Resolver" | "External";
  latency_ms: number;
  status: "resolved" | "nxdomain" | "timeout" | "refused";
  ran_at: string;
}

// ─── Scenario Simulator ───────────────────────────────────────────────────────

export type ScenarioType =
  | "missing_logs"
  | "misconfigured_sg"
  | "public_edge_exposure"
  | "failed_isolation"
  | "delayed_telemetry"
  | "nacl_conflict";

export interface Scenario {
  id: ScenarioType;
  name: string;
  description: string;
  severity: Severity;
  affected_resources: string[];
  simulation_steps: string[];
  expected_findings: string[];
  remediation_preview: string[];
}
