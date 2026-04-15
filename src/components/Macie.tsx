import { useState, useEffect } from "react";
import { FindingDetailPanel, type WorkflowData } from "./ui/FindingDetailPanel";
import {
  Eye,
  Database,
  AlertTriangle,
  Shield,
  Key,
  User,
  CreditCard,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { ScanPageHeader } from "./ui/ScanPageHeader";
import { SeverityBadge } from "./ui/SeverityBadge";
import { StatCard } from "./ui/StatCard";

interface MacieFinding {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  bucket_name: string;
  object_key: string;
  sensitive_data_type: string;
  data_classification: string;
  occurrences: number;
  first_observed_at: string;
  last_observed_at: string;
}

const mockMacieFindings: MacieFinding[] = [
  {
    id: 'macie-001',
    type: 'Policy:IAMUser/S3BucketExposedPublicly',
    title: 'S3 bucket contains PII and is publicly accessible',
    description: 'S3 bucket "customer-data-backups" contains personally identifiable information (PII) and has public read access enabled',
    severity: 'CRITICAL',
    category: 'Data Privacy',
    bucket_name: 'customer-data-backups',
    object_key: 'customers/pii-data.csv',
    sensitive_data_type: 'SSN, Email Address, Credit Card',
    data_classification: 'PII',
    occurrences: 1,
    first_observed_at: '2024-01-15T08:00:00Z',
    last_observed_at: '2024-01-15T08:00:00Z'
  },
  {
    id: 'macie-002',
    type: 'Policy:IAMUser/S3BucketSharedExternally',
    title: 'S3 bucket shared with external AWS account',
    description: 'S3 bucket "shared-documents" is shared with external AWS account 999999999999',
    severity: 'HIGH',
    category: 'Data Exposure',
    bucket_name: 'shared-documents',
    object_key: 'contracts/partner-agreement.pdf',
    sensitive_data_type: 'Business Documents',
    data_classification: 'Confidential',
    occurrences: 5,
    first_observed_at: '2024-01-14T10:30:00Z',
    last_observed_at: '2024-01-14T16:45:00Z'
  },
  {
    id: 'macie-003',
    type: 'SensitiveData:S3Object/Credentials',
    title: 'Credentials detected in S3 object',
    description: 'S3 object contains potential AWS access keys or API tokens',
    severity: 'CRITICAL',
    category: 'Credential Exposure',
    bucket_name: 'application-logs',
    object_key: 'debug/config.log',
    sensitive_data_type: 'AWS Access Key, API Token',
    data_classification: 'Credentials',
    occurrences: 1,
    first_observed_at: '2024-01-13T14:20:00Z',
    last_observed_at: '2024-01-13T14:20:00Z'
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

const CLASSIFICATION_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  PII:         { bg: 'rgba(255,0,64,0.12)',   border: 'rgba(255,0,64,0.28)',   text: '#ff0040' },
  Credentials: { bg: 'rgba(255,0,64,0.12)',   border: 'rgba(255,0,64,0.28)',   text: '#ff0040' },
  Confidential:{ bg: 'rgba(255,107,53,0.12)', border: 'rgba(255,107,53,0.28)', text: '#ff6b35' },
  Internal:    { bg: 'rgba(255,176,0,0.12)',  border: 'rgba(255,176,0,0.28)',  text: '#ffb000' },
};

const DATA_TYPE_LEGEND: { label: string; color: string; icon: React.ReactNode }[] = [
  { label: 'SSN',            color: '#ff0040', icon: <User size={10} /> },
  { label: 'Email',          color: '#ff6b35', icon: <User size={10} /> },
  { label: 'Credit Card',    color: '#ff0040', icon: <CreditCard size={10} /> },
  { label: 'AWS Access Key', color: '#ff0040', icon: <Key size={10} /> },
  { label: 'Business Docs',  color: '#ffb000', icon: <FileText size={10} /> },
  { label: 'API Token',      color: '#ff0040', icon: <Key size={10} /> },
];

const CARD_STYLE: React.CSSProperties = {
  background: 'rgba(15,23,42,0.6)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 10,
  padding: '20px 24px',
};

const CHIP_BASE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 16px',
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

function getShortType(type: string): string {
  const parts = type.split('/');
  return parts[parts.length - 1] || type;
}

function getSensitiveDataPills(types: string): string[] {
  return types.split(',').map(s => s.trim()).filter(Boolean);
}

function getDataTypePillStyle(label: string): React.CSSProperties {
  const lc = label.toLowerCase();
  let color = '#64748b';
  if (lc.includes('ssn') || lc.includes('credit') || lc.includes('aws') || lc.includes('api token')) color = '#ff0040';
  else if (lc.includes('email')) color = '#ff6b35';
  else if (lc.includes('business') || lc.includes('doc')) color = '#ffb000';
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 600,
    background: `${color}14`,
    border: `1px solid ${color}33`,
    color,
    whiteSpace: 'nowrap' as const,
  };
}

function getRemediation(category: string): string {
  const cat = category.toLowerCase();
  if (cat.includes('privacy') || cat.includes('credential')) {
    return 'Immediately restrict bucket access. Enable S3 Block Public Access. Review and rotate any exposed credentials. Notify security team per incident response plan.';
  }
  if (cat.includes('exposure')) {
    return 'Review bucket policy and ACLs. Ensure only authorized AWS accounts have access. Enable access logging.';
  }
  return 'Review S3 bucket permissions. Classify data and apply appropriate access controls.';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getAge(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days}d ago`;
}

export function Macie() {
  const [findings] = useState<MacieFinding[]>(mockMacieFindings);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
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
    toast.info('Refreshing Macie findings...');
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Macie findings updated');
    }, 1500);
  };

  const filteredFindings = findings.filter(f => {
    if (selectedSeverity !== 'all' && f.severity !== selectedSeverity) return false;
    if (selectedCategory !== 'all' && f.category !== selectedCategory) return false;
    return true;
  });

  const totalFindings = findings.length;
  const piiExposed = findings.filter(f => f.data_classification === 'PII').length;
  const credentialsFound = findings.filter(f => f.data_classification === 'Credentials').length;
  const bucketsAffected = new Set(findings.map(f => f.bucket_name)).size;

  const severityFilters = ['all', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const categoryFilters = [
    { label: 'All', value: 'all' },
    { label: 'Data Privacy', value: 'Data Privacy' },
    { label: 'Data Exposure', value: 'Data Exposure' },
    { label: 'Credential Exposure', value: 'Credential Exposure' },
  ];

  return (
    <div className="flex min-w-0 w-full flex-col gap-4 p-3 sm:gap-5 sm:p-5 md:px-7 md:py-6" style={{ color: '#e2e8f0' }}>

      <ScanPageHeader
        icon={<Eye size={20} color="#00ff88" />}
        iconColor="#00ff88"
        title="Macie — Data Security"
        subtitle="Automated sensitive data discovery and DLP — PII, credentials, and financial data in S3"
        isScanning={isRefreshing}
        onRefresh={handleRefresh}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Findings" value={totalFindings} accent="#e2e8f0" icon={AlertTriangle} />
        <StatCard label="PII Exposed" value={piiExposed} accent="#ff0040" icon={User} />
        <StatCard label="Credentials Found" value={credentialsFound} accent="#ff0040" icon={Key} />
        <StatCard label="Buckets Affected" value={bucketsAffected} accent="#ffb000" icon={Database} />
      </div>

      {/* Data Type Legend */}
      <div style={{ ...CARD_STYLE, padding: '16px 24px' }}>
        <p style={{ fontSize: 11, color: 'rgba(100,116,139,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Discovered Data Types</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {DATA_TYPE_LEGEND.map(dt => (
            <span
              key={dt.label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 12px',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 600,
                background: `${dt.color}14`,
                border: `1px solid ${dt.color}33`,
                color: dt.color,
              }}
            >
              {dt.icon}
              {dt.label}
            </span>
          ))}
        </div>
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
          {/* Category chips */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'rgba(100,116,139,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 4 }}>Category</span>
            {categoryFilters.map(cf => {
              const active = selectedCategory === cf.value;
              return (
                <button
                  key={cf.value}
                  onClick={() => setSelectedCategory(cf.value)}
                  style={{
                    ...CHIP_BASE,
                    background: active ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
                    borderColor: active ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.07)',
                    color: active ? '#e2e8f0' : 'rgba(100,116,139,0.8)',
                  }}
                >
                  {cf.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Findings Table */}
      <div className="min-w-0" style={{ ...CARD_STYLE, overflow: 'hidden' }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>Data Sensitivity Findings</span>
          <span style={{ fontSize: 12, color: 'rgba(100,116,139,0.7)' }}>
            {filteredFindings.length} finding{filteredFindings.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table Header */}
        <div className="hidden md:grid" style={{
          gridTemplateColumns: '6px 170px 1fr 140px 130px 80px 90px 30px',
          gap: 12,
          padding: '0 12px 8px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          alignItems: 'center',
        }}>
          {['', 'Finding Type', 'Bucket / Object', 'Sensitive Data', 'Classification', 'Occurrences', 'Age', ''].map((h, i) => (
            <span key={i} style={{ fontSize: 11, fontWeight: 600, color: 'rgba(100,116,139,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {h}
            </span>
          ))}
        </div>

        {filteredFindings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(100,116,139,0.7)' }}>
            <Shield size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ margin: 0 }}>No findings match the selected filters.</p>
          </div>
        ) : (
          filteredFindings.map((finding, idx) => {
            const isExpanded = expandedId === finding.id;
            const sColor = SEVERITY_COLOR[finding.severity] || '#64748b';
            const classStyle = CLASSIFICATION_COLOR[finding.data_classification] || {
              bg: 'rgba(100,116,139,0.12)',
              border: 'rgba(100,116,139,0.28)',
              text: '#64748b',
            };
            const pills = getSensitiveDataPills(finding.sensitive_data_type);

            return (
              <div key={finding.id}>
                <button
                  type="button"
                  className="block w-full border-b border-white/[0.05] px-3 py-3 text-left md:hidden"
                  onClick={() => setExpandedId(isExpanded ? null : finding.id)}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">{isExpanded ? "Tap to collapse" : "Tap to expand"}</span>
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronUp size={14} color="rgba(100,116,139,0.8)" /> : <ChevronDown size={14} color="rgba(100,116,139,0.8)" />}
                      <SeverityBadge severity={finding.severity} size="sm" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-200 break-words">{finding.type}</div>
                    <div className="mt-0.5 truncate font-mono text-[11px] text-slate-500">{finding.bucket_name}</div>
                  </div>
                  <div className="mt-2 truncate text-[10px] text-slate-400">{finding.sensitive_data_type}</div>
                </button>

                <div
                  onClick={() => setExpandedId(isExpanded ? null : finding.id)}
                  className="hidden md:grid"
                  style={{
                    gridTemplateColumns: '6px 170px 1fr 140px 130px 80px 90px 30px',
                    gap: 12,
                    padding: '16px 12px',
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
                  <div style={{ width: 4, height: 36, borderRadius: 2, background: sColor, flexShrink: 0 }} />

                  {/* Finding Type (short) */}
                  <div style={{ minWidth: 0 }}>
                    <span style={{
                      fontFamily: '"JetBrains Mono", "Fira Mono", monospace',
                      fontSize: 11,
                      color: 'rgba(100,116,139,0.85)',
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {getShortType(finding.type)}
                    </span>
                  </div>

                  {/* Bucket / Object */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontFamily: '"JetBrains Mono", "Fira Mono", monospace',
                      fontSize: 12,
                      color: '#00ff88',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {finding.bucket_name}
                    </div>
                    <div style={{
                      fontFamily: '"JetBrains Mono", "Fira Mono", monospace',
                      fontSize: 11,
                      color: 'rgba(100,116,139,0.6)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {finding.object_key}
                    </div>
                  </div>

                  {/* Sensitive Data Pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {pills.slice(0, 2).map(p => (
                      <span key={p} style={getDataTypePillStyle(p)}>{p}</span>
                    ))}
                    {pills.length > 2 && (
                      <span style={{ fontSize: 10, color: 'rgba(100,116,139,0.6)', alignSelf: 'center' }}>
                        +{pills.length - 2}
                      </span>
                    )}
                  </div>

                  {/* Classification */}
                  <div>
                    <SeverityBadge severity={finding.severity} size="sm" label={finding.data_classification} />
                  </div>

                  {/* Occurrences */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: sColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{finding.occurrences}</span>
                  </div>

                  {/* Age */}
                  <span style={{ fontSize: 11, color: 'rgba(100,116,139,0.7)' }}>
                    {getAge(finding.first_observed_at)}
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
                        <div className="text-[10px] uppercase tracking-wider text-slate-500">Bucket</div>
                        <div className="break-all text-[11px] text-slate-300">{finding.bucket_name}</div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500">Sensitive data</div>
                        <div className="text-[11px] leading-relaxed text-slate-300">{finding.sensitive_data_type}</div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500">Description</div>
                        <div className="text-[11px] leading-relaxed text-slate-300">{finding.description}</div>
                      </div>
                    </div>
                    <div className="hidden md:block">
                      <FindingDetailPanel
                        finding={{
                          id: finding.id,
                          title: finding.type ?? finding.title,
                          resource_name: finding.bucket_name,
                          resource_arn: undefined,
                          severity: finding.severity,
                          description: finding.description,
                          recommendation: getRemediation(finding.category),
                          risk_score: undefined,
                          compliance_frameworks: ["GDPR Art.32", "HIPAA 164.312", "PCI-DSS 3.4"],
                          last_seen: finding.last_observed_at,
                          first_seen: finding.first_observed_at,
                          region: undefined,
                          metadata: {
                            ...(finding.bucket_name ? { "Bucket": finding.bucket_name } : {}),
                            ...(finding.occurrences !== undefined ? { "Objects": String(finding.occurrences) } : {}),
                            ...(finding.data_classification ? { "Data Type": finding.data_classification } : {}),
                            ...(finding.sensitive_data_type ? { "Sensitive Data": finding.sensitive_data_type } : {}),
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
