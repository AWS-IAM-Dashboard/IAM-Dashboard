import { useState, useEffect } from "react";
import { FindingDetailPanel, type WorkflowData } from "./ui/FindingDetailPanel";
import {
  AlertTriangle,
  Package,
  Server,
  Box,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Zap,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { ScanPageHeader } from "./ui/ScanPageHeader";
import { SeverityBadge } from "./ui/SeverityBadge";
import { StatCard } from "./ui/StatCard";

interface InspectorFinding {
  id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  vulnerability_id: string;
  cve_id?: string;
  package_name?: string;
  resource_type: string;
  resource_id: string;
  region: string;
  first_observed_at: string;
  last_observed_at: string;
}

const mockInspectorFindings: InspectorFinding[] = [
  {
    id: 'inspector-001',
    title: 'Critical severity vulnerability found in EC2 instance',
    description: 'EC2 instance contains a package with a critical vulnerability (CVE-2024-0001)',
    severity: 'CRITICAL',
    vulnerability_id: 'CVE-2024-0001',
    cve_id: 'CVE-2024-0001',
    package_name: 'openssl-1.1.1',
    resource_type: 'AWS_EC2_INSTANCE',
    resource_id: 'i-1234567890abcdef0',
    region: 'us-east-1',
    first_observed_at: '2024-01-15T08:00:00Z',
    last_observed_at: '2024-01-15T14:30:00Z'
  },
  {
    id: 'inspector-002',
    title: 'High severity vulnerability in Lambda function',
    description: 'Lambda function contains a dependency with known high severity vulnerability',
    severity: 'HIGH',
    vulnerability_id: 'GHSA-xxxx-xxxx-xxxx',
    package_name: 'lodash-4.17.20',
    resource_type: 'AWS_LAMBDA_FUNCTION',
    resource_id: 'security-scanner-function',
    region: 'us-east-1',
    first_observed_at: '2024-01-14T10:15:00Z',
    last_observed_at: '2024-01-14T10:15:00Z'
  },
  {
    id: 'inspector-003',
    title: 'Medium severity vulnerability in ECR image',
    description: 'Container image contains outdated base image with medium severity issues',
    severity: 'MEDIUM',
    vulnerability_id: 'CVE-2023-9999',
    package_name: 'alpine-base-3.15',
    resource_type: 'AWS_ECR_CONTAINER_IMAGE',
    resource_id: '123456789012.dkr.ecr.us-east-1.amazonaws.com/app:latest',
    region: 'us-east-1',
    first_observed_at: '2024-01-13T16:20:00Z',
    last_observed_at: '2024-01-13T16:20:00Z'
  }
];

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: '#ff0040',
  HIGH: '#ff6b35',
  MEDIUM: '#ffb000',
  LOW: '#00ff88',
};

const SEVERITY_BG: Record<string, string> = {
  CRITICAL: 'rgba(255,0,64,0.13)',
  HIGH: 'rgba(255,107,53,0.13)',
  MEDIUM: 'rgba(255,176,0,0.13)',
  LOW: 'rgba(0,255,136,0.13)',
};

const CARD_STYLE: React.CSSProperties = {
  background: 'rgba(15,23,42,0.6)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 10,
  padding: '20px 24px',
};

const CHIP_BASE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 14px',
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  border: '1px solid rgba(255,255,255,0.10)',
  transition: 'all 0.15s',
  userSelect: 'none',
  background: 'rgba(255,255,255,0.03)',
  color: 'rgba(100,116,139,0.9)',
};

function getResourceLabel(type: string): string {
  if (type === 'AWS_EC2_INSTANCE') return 'EC2 Instance';
  if (type === 'AWS_LAMBDA_FUNCTION') return 'Lambda';
  if (type === 'AWS_ECR_CONTAINER_IMAGE') return 'ECR Image';
  return type;
}

function getResourceIcon(type: string) {
  if (type === 'AWS_EC2_INSTANCE') return <Server size={14} color="#64748b" />;
  if (type === 'AWS_LAMBDA_FUNCTION') return <Zap size={14} color="#64748b" />;
  if (type === 'AWS_ECR_CONTAINER_IMAGE') return <Box size={14} color="#64748b" />;
  return <Package size={14} color="#64748b" />;
}

function getRemediation(resourceType: string, packageName?: string): string {
  const pkg = packageName ? packageName.split('-')[0] : 'package';
  if (resourceType === 'AWS_EC2_INSTANCE') {
    return `Patch OS packages: sudo yum update ${pkg} or apt-get upgrade ${pkg}. Reboot if kernel update.`;
  }
  if (resourceType === 'AWS_LAMBDA_FUNCTION') {
    return 'Update dependency in requirements.txt/package.json. Redeploy function.';
  }
  if (resourceType === 'AWS_ECR_CONTAINER_IMAGE') {
    return 'Rebuild container with updated base image. Push new tag. Update ECS/EKS service.';
  }
  return 'Review and remediate the vulnerability per AWS Inspector recommendations.';
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + '…';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getPackageName(raw?: string): string {
  if (!raw) return '';
  const parts = raw.split('-');
  return parts.slice(0, -1).join('-') || raw;
}

function getPackageVersion(raw?: string): string {
  if (!raw) return '';
  const parts = raw.split('-');
  return parts[parts.length - 1] || '';
}

export function Inspector() {
  const [findings] = useState<InspectorFinding[]>(mockInspectorFindings);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedResourceType, setSelectedResourceType] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<Record<string, WorkflowData>>({});

  useEffect(() => {
    setWorkflows(prev => {
      const next = { ...prev };
      findings.forEach(f => {
        if (!next[f.id]) {
          next[f.id] = { status: "NEW", first_seen: f.first_observed_at, timeline: [] };
        }
      });
      return next;
    });
  }, [findings]);

  const advanceStatus = (id: string) => { const NEXT: Record<string, WorkflowData["status"]> = { NEW: "TRIAGED", TRIAGED: "ASSIGNED", ASSIGNED: "IN_PROGRESS", IN_PROGRESS: "PENDING_VERIFY", PENDING_VERIFY: "REMEDIATED" }; setWorkflows(prev => { const w = prev[id]; if (!w) return prev; const n = NEXT[w.status]; if (!n) return prev; return { ...prev, [id]: { ...w, status: n, timeline: [...w.timeline, { id: `${id}-${Date.now()}`, timestamp: new Date().toISOString(), actor: "Security Analyst", actor_type: "analyst" as const, action: `Status advanced to ${n}` }] } }; }); };
  const assignFinding = (id: string, assignee: string) => { setWorkflows(prev => { const w = prev[id] ?? { status: "NEW" as const, first_seen: new Date().toISOString(), timeline: [] }; return { ...prev, [id]: { ...w, assignee, status: (w.status === "NEW" || w.status === "TRIAGED") ? "ASSIGNED" : w.status, timeline: [...w.timeline, { id: `${id}-${Date.now()}`, timestamp: new Date().toISOString(), actor: "Security Analyst", actor_type: "analyst" as const, action: `Assigned to ${assignee}` }] } }; }); toast.success(`Assigned to ${assignee}`); };
  const markFalsePositive = (id: string) => { setWorkflows(prev => { const w = prev[id] ?? { status: "NEW" as const, first_seen: new Date().toISOString(), timeline: [] }; return { ...prev, [id]: { ...w, status: "FALSE_POSITIVE", timeline: [...w.timeline, { id: `${id}-${Date.now()}`, timestamp: new Date().toISOString(), actor: "Security Analyst", actor_type: "analyst" as const, action: "Marked as false positive" }] } }; }); toast.info("Marked as false positive"); };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    toast.info('Refreshing Inspector findings...');
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Inspector findings updated');
    }, 1500);
  };

  const filteredFindings = findings.filter(f => {
    if (selectedSeverity !== 'all' && f.severity !== selectedSeverity) return false;
    if (selectedResourceType !== 'all' && f.resource_type !== selectedResourceType) return false;
    return true;
  });

  const totalCVEs = findings.length;
  const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length;
  const highCount = findings.filter(f => f.severity === 'HIGH').length;
  const affectedResources = new Set(findings.map(f => f.resource_id)).size;

  const severityFilters = ['all', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const resourceTypeFilters = [
    { label: 'All', value: 'all' },
    { label: 'EC2 Instance', value: 'AWS_EC2_INSTANCE' },
    { label: 'Lambda', value: 'AWS_LAMBDA_FUNCTION' },
    { label: 'ECR Image', value: 'AWS_ECR_CONTAINER_IMAGE' },
  ];

  return (
    <div className="flex min-w-0 w-full flex-col gap-4 p-3 sm:gap-5 sm:p-5 md:px-7 md:py-6" style={{ color: '#e2e8f0' }}>

      <ScanPageHeader
        icon={<Lock size={20} color="#00ff88" />}
        iconColor="#00ff88"
        title="Inspector"
        subtitle="Automated vulnerability management for EC2, Lambda, and ECR container images"
        isScanning={isRefreshing}
        onRefresh={handleRefresh}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total CVEs" value={totalCVEs} accent="#e2e8f0" icon={Package} />
        <StatCard label="Critical" value={criticalCount} accent="#ff0040" icon={AlertTriangle} />
        <StatCard label="High" value={highCount} accent="#ff6b35" icon={AlertTriangle} />
        <StatCard label="Affected Resources" value={affectedResources} accent="#ffb000" icon={Server} />
      </div>

      {/* Filter Bar */}
      <div style={{ ...CARD_STYLE, padding: '16px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Severity chips */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'rgba(100,116,139,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 4 }}>Severity</span>
            {severityFilters.map(s => {
              const active = selectedSeverity === s;
              const color = s === 'all' ? '#e2e8f0' : SEVERITY_COLOR[s];
              const bg = s === 'all' ? 'rgba(255,255,255,0.06)' : SEVERITY_BG[s];
              return (
                <button
                  key={s}
                  onClick={() => setSelectedSeverity(s)}
                  style={{
                    ...CHIP_BASE,
                    background: active ? bg : 'rgba(255,255,255,0.03)',
                    borderColor: active ? (s === 'all' ? 'rgba(255,255,255,0.20)' : `${color}44`) : 'rgba(255,255,255,0.07)',
                    color: active ? color : 'rgba(100,116,139,0.8)',
                  }}
                >
                  {s === 'all' ? 'All' : s}
                </button>
              );
            })}
          </div>
          {/* Resource type chips */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'rgba(100,116,139,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 4 }}>Resource</span>
            {resourceTypeFilters.map(rt => {
              const active = selectedResourceType === rt.value;
              return (
                <button
                  key={rt.value}
                  onClick={() => setSelectedResourceType(rt.value)}
                  style={{
                    ...CHIP_BASE,
                    background: active ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
                    borderColor: active ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.07)',
                    color: active ? '#e2e8f0' : 'rgba(100,116,139,0.8)',
                  }}
                >
                  {rt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Findings Table */}
      <div className="min-w-0" style={{ ...CARD_STYLE, overflow: 'hidden' }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>
            Vulnerability Findings
          </span>
          <span style={{ fontSize: 12, color: 'rgba(100,116,139,0.7)' }}>
            {filteredFindings.length} finding{filteredFindings.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table Header */}
        <div className="hidden md:grid" style={{
          gridTemplateColumns: '6px 200px 160px 170px 60px 100px 100px 30px',
          gap: 12,
          padding: '0 12px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          alignItems: 'center',
        }}>
          {['', 'CVE / Vuln ID', 'Package + Version', 'Resource', 'Type', 'First Seen', 'Last Seen', ''].map((h, i) => (
            <span key={i} style={{ fontSize: 11, fontWeight: 600, color: 'rgba(100,116,139,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {h}
            </span>
          ))}
        </div>

        {filteredFindings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(100,116,139,0.7)' }}>
            <AlertTriangle size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ margin: 0 }}>No findings match the selected filters.</p>
          </div>
        ) : (
          filteredFindings.map((finding, idx) => {
            const isExpanded = expandedId === finding.id;
            const color = SEVERITY_COLOR[finding.severity] || '#64748b';
            const pkgName = getPackageName(finding.package_name);
            const pkgVersion = getPackageVersion(finding.package_name);

            return (
              <div key={finding.id}>
                <button
                  type="button"
                  className="block w-full border-b border-white/[0.05] px-3 py-3 text-left md:hidden"
                  onClick={() => setExpandedId(isExpanded ? null : finding.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-200">{finding.title}</div>
                      <div className="mt-0.5 truncate font-mono text-[11px] text-slate-500">{finding.cve_id ?? finding.vulnerability_id}</div>
                    </div>
                    <SeverityBadge severity={finding.severity} size="sm" />
                  </div>
                  <div className="mt-2 truncate font-mono text-[10px] text-slate-500">{finding.resource_id}</div>
                </button>

                <div
                  onClick={() => setExpandedId(isExpanded ? null : finding.id)}
                  className="hidden md:grid"
                  style={{
                    gridTemplateColumns: '6px 200px 160px 170px 60px 100px 100px 30px',
                    gap: 12,
                    padding: '14px 12px',
                    borderBottom: idx < filteredFindings.length - 1 || isExpanded ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    cursor: 'pointer',
                    background: isExpanded ? 'rgba(255,255,255,0.03)' : 'transparent',
                    transition: 'background 0.15s',
                    alignItems: 'center',
                  }}
                  onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)'; }}
                  onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                >
                  {/* Severity bar */}
                  <div style={{ width: 4, height: 36, borderRadius: 2, background: color, flexShrink: 0 }} />

                  {/* CVE ID */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    {finding.cve_id ? (
                      <>
                        <span style={{
                          fontFamily: '"JetBrains Mono", "Fira Mono", monospace',
                          fontSize: 12,
                          color,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: `${color}14`,
                          border: `1px solid ${color}33`,
                          whiteSpace: 'nowrap',
                        }}>
                          {finding.cve_id}
                        </span>
                        <a
                          href={`https://nvd.nist.gov/vuln/detail/${finding.cve_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{ color: 'rgba(100,116,139,0.5)', lineHeight: 0 }}
                        >
                          <ExternalLink size={11} />
                        </a>
                      </>
                    ) : (
                      <span style={{
                        fontFamily: '"JetBrains Mono", "Fira Mono", monospace',
                        fontSize: 12,
                        color: 'rgba(100,116,139,0.8)',
                        whiteSpace: 'nowrap',
                      }}>
                        {truncate(finding.vulnerability_id, 22)}
                      </span>
                    )}
                  </div>

                  {/* Package */}
                  <div style={{ minWidth: 0 }}>
                    {finding.package_name ? (
                      <>
                        <div style={{ fontFamily: '"JetBrains Mono", "Fira Mono", monospace', fontSize: 12, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {pkgName}
                        </div>
                        {pkgVersion && (
                          <div style={{ fontFamily: '"JetBrains Mono", "Fira Mono", monospace', fontSize: 11, color: 'rgba(100,116,139,0.6)' }}>
                            v{pkgVersion}
                          </div>
                        )}
                      </>
                    ) : (
                      <span style={{ fontSize: 12, color: 'rgba(100,116,139,0.5)' }}>—</span>
                    )}
                  </div>

                  {/* Resource ID */}
                  <div style={{ minWidth: 0 }}>
                    <span style={{
                      fontFamily: '"JetBrains Mono", "Fira Mono", monospace',
                      fontSize: 11,
                      color: '#e2e8f0',
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {truncate(finding.resource_id, 22)}
                    </span>
                  </div>

                  {/* Resource Type Icon */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {getResourceIcon(finding.resource_type)}
                  </div>

                  {/* First Seen */}
                  <span style={{ fontSize: 11, color: 'rgba(100,116,139,0.7)' }}>
                    {formatDate(finding.first_observed_at)}
                  </span>

                  {/* Last Seen */}
                  <span style={{ fontSize: 11, color: 'rgba(100,116,139,0.7)' }}>
                    {formatDate(finding.last_observed_at)}
                  </span>

                  {/* Expand */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(100,116,139,0.5)' }}>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <>
                    <div className="md:hidden px-3 pb-3">
                      <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500">Vulnerability</div>
                        <div className="break-all text-[11px] text-slate-300">{finding.cve_id ?? finding.vulnerability_id}</div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500">Description</div>
                        <div className="text-[11px] leading-relaxed text-slate-300">{finding.description}</div>
                      </div>
                    </div>
                    <div className="hidden md:block">
                      <FindingDetailPanel
                        finding={{
                          id: finding.id,
                          title: finding.title ?? finding.cve_id ?? finding.vulnerability_id,
                          resource_name: finding.resource_id,
                          resource_arn: undefined,
                          severity: finding.severity,
                          description: finding.description,
                          recommendation: getRemediation(finding.resource_type, finding.package_name),
                          risk_score: undefined,
                          compliance_frameworks: undefined,
                          last_seen: finding.last_observed_at,
                          first_seen: finding.first_observed_at,
                          region: finding.region,
                          metadata: {
                            ...(finding.cve_id ? { "CVE": finding.cve_id } : {}),
                            ...(finding.package_name ? { "Package": finding.package_name } : {}),
                          },
                        }}
                        workflow={workflows[finding.id]}
                        onAdvanceStatus={advanceStatus}
                        onAssign={assignFinding}
                        onMarkFalsePositive={markFalsePositive}
                        onCreateTicket={(id) => toast.info("Create ticket", { description: id })}
                        onClose={() => setExpandedId(null)}
                      />
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
