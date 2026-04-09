// Security Operations Center — shared types

export type AlertSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type AlertStatus =
  | "NEW"
  | "ACKNOWLEDGED"
  | "INVESTIGATING"
  | "ESCALATED"
  | "RESOLVED"
  | "SUPPRESSED"
  | "FALSE_POSITIVE";

export interface SOCAlert {
  id: string;
  title: string;
  severity: AlertSeverity;
  source: string;
  resource: string;
  resource_arn: string;
  status: AlertStatus;
  assignee?: string;
  created_at: string;
  sla_deadline: string;
  sla_breached: boolean;
  tags: string[];
  region: string;
  count: number; // deduplicated count
  investigation_id?: string;
  mitre_technique?: string;
  rule_id: string;
  suppression_reason?: string;
}

export type CoverageStatus = "healthy" | "partial" | "degraded" | "uncovered";

export interface ServiceCoverage {
  id: string;
  name: string;
  category: string;
  coverage: CoverageStatus;
  detector_count: number;
  event_sources: number;
  last_event: string;
  findings_7d: number;
  region_coverage: Record<string, CoverageStatus>;
  gap_reason?: string;
}

export type PipelineStatus = "healthy" | "degraded" | "error" | "offline";

export interface PipelineSource {
  id: string;
  name: string;
  type: string;
  status: PipelineStatus;
  ingest_eps: number;       // events per second
  lag_seconds: number;
  error_rate_pct: number;
  last_event: string;
  destination: string;
  daily_volume_gb: number;
  retention_days: number;
}

export interface PipelineError {
  id: string;
  timestamp: string;
  source_id: string;
  message: string;
  code: string;
  resolved: boolean;
}

export type InvestigationStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "PENDING_REVIEW"
  | "CLOSED";

export interface InvestigationEvent {
  id: string;
  timestamp: string;
  type: "alert_linked" | "note" | "evidence_added" | "status_change" | "query_run" | "containment";
  actor: string;
  summary: string;
  detail?: string;
}

export interface Evidence {
  id: string;
  type: "snapshot" | "log_export" | "memory_dump" | "screenshot" | "query_result" | "network_capture";
  label: string;
  s3_uri?: string;
  collected_at: string;
  size_bytes?: number;
  hash_sha256?: string;
  collected_by: string;
}

export interface Investigation {
  id: string;
  title: string;
  severity: AlertSeverity;
  status: InvestigationStatus;
  assignee?: string;
  created_at: string;
  updated_at: string;
  sla_deadline: string;
  linked_alert_ids: string[];
  timeline: InvestigationEvent[];
  evidence: Evidence[];
  tags: string[];
  summary?: string;
  affected_resources: string[];
}

export interface SavedQuery {
  id: string;
  name: string;
  source: string;
  query: string;
  description: string;
  last_run?: string;
}

export interface QueryResult {
  columns: string[];
  rows: string[][];
  row_count: number;
  scanned_bytes: number;
  execution_ms: number;
  query_id: string;
}

export interface SOCThreshold {
  severity: AlertSeverity;
  sla_hours: number;
  auto_escalate_hours: number;
  auto_suppress_duplicate_hours: number;
  page_oncall: boolean;
}

export interface RoutingRule {
  id: string;
  name: string;
  condition: string;
  destination_team: string;
  channel: string;
  priority: number;
  enabled: boolean;
}

export interface EscalationPath {
  id: string;
  name: string;
  severity: AlertSeverity;
  steps: Array<{
    delay_minutes: number;
    notify: string;
    method: string;
  }>;
}

export interface SOCConfig {
  thresholds: SOCThreshold[];
  routing_rules: RoutingRule[];
  escalation_paths: EscalationPath[];
  retention: Record<string, number>;
  updated_at: string;
}
