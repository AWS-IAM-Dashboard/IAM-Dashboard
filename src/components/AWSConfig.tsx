import { useState, useEffect } from "react";
import { FindingDetailPanel, type WorkflowData } from "./ui/FindingDetailPanel";
import {
  Settings2,
  Settings,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { ScanPageHeader } from "./ui/ScanPageHeader";
import { SeverityBadge } from "./ui/SeverityBadge";
import { StatCard } from "./ui/StatCard";

interface ConfigRule {
  id: string;
  name: string;
  description: string;
  compliance_status: 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_APPLICABLE';
  resource_type: string;
  resource_count: number;
  last_evaluated: string;
}

interface ComplianceSummary {
  total_rules: number;
  compliant_rules: number;
  non_compliant_rules: number;
  not_applicable_rules: number;
  compliance_percentage: number;
}

const mockRules: ConfigRule[] = [
  {
    id: 'config-rule-001',
    name: 's3-bucket-public-read-prohibited',
    description: 'Checks that S3 buckets do not allow public read access',
    compliance_status: 'NON_COMPLIANT',
    resource_type: 'AWS::S3::Bucket',
    resource_count: 3,
    last_evaluated: '2024-01-15T10:00:00Z'
  },
  {
    id: 'config-rule-002',
    name: 'iam-password-policy',
    description: 'Checks that IAM password policy meets the specified requirements',
    compliance_status: 'COMPLIANT',
    resource_type: 'AWS::IAM::AccountPasswordPolicy',
    resource_count: 1,
    last_evaluated: '2024-01-15T09:30:00Z'
  },
  {
    id: 'config-rule-003',
    name: 'encrypted-volumes',
    description: 'Checks that EBS volumes are encrypted',
    compliance_status: 'NON_COMPLIANT',
    resource_type: 'AWS::EC2::Volume',
    resource_count: 5,
    last_evaluated: '2024-01-15T09:00:00Z'
  }
];

const mockSummary: ComplianceSummary = {
  total_rules: 24,
  compliant_rules: 16,
  non_compliant_rules: 7,
  not_applicable_rules: 1,
  compliance_percentage: 67
};

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}

function getRemediationHint(ruleName: string): string {
  const name = ruleName.toLowerCase();
  if (name.includes('s3')) {
    return 'Enable S3 Block Public Access at account level. Review bucket policies and ACLs.';
  }
  if (name.includes('iam')) {
    return 'Review IAM password policy. Enforce min length 14, require uppercase/lowercase/numbers/symbols.';
  }
  if (name.includes('encrypted') || name.includes('volume')) {
    return 'Enable EBS encryption by default in EC2 settings. Encrypt existing volumes via snapshot.';
  }
  return 'Review rule configuration and remediate non-compliant resources via AWS Console.';
}

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
};

export function AWSConfig() {
  const [rules] = useState<ConfigRule[]>(mockRules);
  const [summary] = useState<ComplianceSummary>(mockSummary);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<Record<string, WorkflowData>>({});

  useEffect(() => {
    setWorkflows(prev => {
      const next = { ...prev };
      rules.forEach(r => {
        if (!next[r.id]) {
          next[r.id] = { status: "NEW", first_seen: r.last_evaluated, timeline: [] };
        }
      });
      return next;
    });
  }, [rules]);

  const advanceStatus = (id: string) => { const NEXT: Record<string, WorkflowData["status"]> = { NEW: "TRIAGED", TRIAGED: "ASSIGNED", ASSIGNED: "IN_PROGRESS", IN_PROGRESS: "PENDING_VERIFY", PENDING_VERIFY: "REMEDIATED" }; setWorkflows(prev => { const w = prev[id]; if (!w) return prev; const n = NEXT[w.status]; if (!n) return prev; return { ...prev, [id]: { ...w, status: n, timeline: [...w.timeline, { id: `${id}-${Date.now()}`, timestamp: new Date().toISOString(), actor: "Security Analyst", actor_type: "analyst" as const, action: `Status advanced to ${n}` }] } }; }); };
  const assignFinding = (id: string, assignee: string) => { setWorkflows(prev => { const w = prev[id] ?? { status: "NEW" as const, first_seen: new Date().toISOString(), timeline: [] }; return { ...prev, [id]: { ...w, assignee, status: (w.status === "NEW" || w.status === "TRIAGED") ? "ASSIGNED" : w.status, timeline: [...w.timeline, { id: `${id}-${Date.now()}`, timestamp: new Date().toISOString(), actor: "Security Analyst", actor_type: "analyst" as const, action: `Assigned to ${assignee}` }] } }; }); toast.success(`Assigned to ${assignee}`); };
  const markFalsePositive = (id: string) => { setWorkflows(prev => { const w = prev[id] ?? { status: "NEW" as const, first_seen: new Date().toISOString(), timeline: [] }; return { ...prev, [id]: { ...w, status: "FALSE_POSITIVE", timeline: [...w.timeline, { id: `${id}-${Date.now()}`, timestamp: new Date().toISOString(), actor: "Security Analyst", actor_type: "analyst" as const, action: "Marked as false positive" }] } }; }); toast.info("Marked as false positive"); };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    toast.info('Refreshing Config compliance status...');
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Config compliance updated');
    }, 1500);
  };

  const filteredRules = rules.filter(r => {
    if (selectedStatus === 'all') return true;
    return r.compliance_status === selectedStatus;
  });

  const complianceColor =
    summary.compliance_percentage > 80
      ? '#00ff88'
      : summary.compliance_percentage > 60
      ? '#ffb000'
      : '#ff0040';

  const statusFilters = [
    { label: 'All', value: 'all' },
    { label: 'COMPLIANT', value: 'COMPLIANT' },
    { label: 'NON_COMPLIANT', value: 'NON_COMPLIANT' },
    { label: 'NOT_APPLICABLE', value: 'NOT_APPLICABLE' },
  ];

  const statusIcon = (status: string) => {
    if (status === 'COMPLIANT') return <CheckCircle2 size={16} color="#00ff88" />;
    if (status === 'NON_COMPLIANT') return <XCircle size={16} color="#ff0040" />;
    return <AlertTriangle size={16} color="#64748b" />;
  };

  return (
    <div className="flex min-w-0 w-full flex-col gap-4 p-3 sm:gap-5 sm:p-5 md:px-7 md:py-6" style={{ color: '#e2e8f0' }}>

      <ScanPageHeader
        icon={<Settings size={20} color="#00ff88" />}
        iconColor="#00ff88"
        title="AWS Config"
        subtitle="Continuous configuration compliance evaluation and drift detection across your AWS resources"
        isScanning={isRefreshing}
        onRefresh={handleRefresh}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Rules" value={summary.total_rules} accent="#e2e8f0" icon={Settings2} />
        <StatCard label="Compliant" value={summary.compliant_rules} accent="#00ff88" icon={CheckCircle2} />
        <StatCard label="Non-Compliant" value={summary.non_compliant_rules} accent="#ff0040" icon={XCircle} />
        <StatCard label="Compliance" value={`${summary.compliance_percentage}%`} accent={complianceColor} />
      </div>

      {/* Progress Bar */}
      <div className="min-w-0" style={{ ...CARD_STYLE, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: 'rgba(100,116,139,0.7)' }}>Overall Compliance</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: complianceColor }}>{summary.compliance_percentage}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${summary.compliance_percentage}%`,
              background: complianceColor,
              borderRadius: 3,
              transition: 'width 0.6s ease',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
          <span style={{ fontSize: 11, color: '#00ff88' }}>{summary.compliant_rules} Compliant</span>
          <span style={{ fontSize: 11, color: '#ff0040' }}>{summary.non_compliant_rules} Non-Compliant</span>
          <span style={{ fontSize: 11, color: '#64748b' }}>{summary.not_applicable_rules} Not Applicable</span>
        </div>
      </div>

      {/* Filter Chips + Table */}
      <div style={CARD_STYLE}>
        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {statusFilters.map(f => {
            const active = selectedStatus === f.value;
            let activeColor = '#00ff88';
            if (f.value === 'NON_COMPLIANT') activeColor = '#ff0040';
            if (f.value === 'NOT_APPLICABLE') activeColor = '#64748b';
            return (
              <button
                key={f.value}
                onClick={() => setSelectedStatus(f.value)}
                style={{
                  ...CHIP_BASE,
                  background: active ? `${activeColor}18` : 'rgba(255,255,255,0.03)',
                  borderColor: active ? `${activeColor}55` : 'rgba(255,255,255,0.08)',
                  color: active ? activeColor : 'rgba(100,116,139,0.9)',
                }}
              >
                {f.label}
              </button>
            );
          })}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(100,116,139,0.7)', alignSelf: 'center' }}>
            {filteredRules.length} rule{filteredRules.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table Header */}
        <div className="hidden md:grid" style={{
          gridTemplateColumns: '36px 1fr 200px 120px 140px 36px',
          gap: 12,
          padding: '0 12px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          {['', 'Rule Name', 'Resource Type', 'Non-Compliant', 'Last Evaluated', ''].map((h, i) => (
            <span key={i} style={{ fontSize: 11, fontWeight: 600, color: 'rgba(100,116,139,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {h}
            </span>
          ))}
        </div>

        {/* Table Rows */}
        {filteredRules.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(100,116,139,0.7)' }}>
            <AlertTriangle size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ margin: 0 }}>No rules match the selected filter.</p>
          </div>
        ) : (
          filteredRules.map((rule, idx) => {
            const isExpanded = expandedId === rule.id;
            return (
              <div key={rule.id}>
                <button
                  type="button"
                  className="block w-full border-b border-white/[0.05] px-3 py-3 text-left md:hidden"
                  onClick={() => setExpandedId(isExpanded ? null : rule.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-200">{rule.name}</div>
                      <div className="mt-0.5 truncate font-mono text-[11px] text-slate-500">{rule.resource_type}</div>
                    </div>
                    {rule.compliance_status === 'NON_COMPLIANT' ? (
                      <SeverityBadge severity="NON_COMPLIANT" size="sm" label={String(rule.resource_count)} />
                    ) : rule.compliance_status === 'COMPLIANT' ? (
                      <SeverityBadge severity="COMPLIANT" size="sm" label="0" />
                    ) : (
                      <SeverityBadge severity="NOT_APPLICABLE" size="sm" />
                    )}
                  </div>
                </button>

                <div
                  onClick={() => setExpandedId(isExpanded ? null : rule.id)}
                  className="hidden md:grid"
                  style={{
                    gridTemplateColumns: '36px 1fr 200px 120px 140px 36px',
                    gap: 12,
                    padding: '14px 12px',
                    borderBottom: idx < filteredRules.length - 1 || isExpanded ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    cursor: 'pointer',
                    background: isExpanded ? 'rgba(255,255,255,0.03)' : 'transparent',
                    transition: 'background 0.15s',
                    alignItems: 'center',
                  }}
                  onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)'; }}
                  onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                >
                  {/* Status Icon */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {statusIcon(rule.compliance_status)}
                  </div>

                  {/* Rule Name */}
                  <div>
                    <span style={{
                      fontFamily: '"JetBrains Mono", "Fira Mono", monospace',
                      fontSize: 13,
                      color: '#e2e8f0',
                    }}>
                      {rule.name}
                    </span>
                  </div>

                  {/* Resource Type */}
                  <div>
                    <span style={{
                      fontFamily: '"JetBrains Mono", "Fira Mono", monospace',
                      fontSize: 11,
                      color: 'rgba(100,116,139,0.7)',
                    }}>
                      {rule.resource_type}
                    </span>
                  </div>

                  {/* Non-Compliant Count */}
                  <div>
                    {rule.compliance_status === 'NON_COMPLIANT' ? (
                      <SeverityBadge severity="NON_COMPLIANT" size="sm" label={String(rule.resource_count)} />
                    ) : rule.compliance_status === 'COMPLIANT' ? (
                      <SeverityBadge severity="COMPLIANT" size="sm" label="0" />
                    ) : (
                      <SeverityBadge severity="NOT_APPLICABLE" size="sm" />
                    )}
                  </div>

                  {/* Last Evaluated */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={12} color="rgba(100,116,139,0.6)" />
                    <span style={{ fontSize: 12, color: 'rgba(100,116,139,0.7)' }}>
                      {getRelativeTime(rule.last_evaluated)}
                    </span>
                  </div>

                  {/* Expand Icon */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(100,116,139,0.5)' }}>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <>
                    <div className="md:hidden px-3 pb-3">
                      <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500">Rule</div>
                        <div className="break-all text-[11px] text-slate-300">{rule.name}</div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500">Description</div>
                        <div className="text-[11px] leading-relaxed text-slate-300">{rule.description}</div>
                      </div>
                    </div>
                    <div className="hidden md:block">
                      <FindingDetailPanel
                        finding={{
                          id: rule.id,
                          title: rule.name,
                          resource_name: rule.resource_type ?? rule.id,
                          resource_arn: undefined,
                          severity: "MEDIUM",
                          description: rule.description,
                          recommendation: getRemediationHint(rule.name),
                          risk_score: undefined,
                          compliance_frameworks: undefined,
                          last_seen: rule.last_evaluated,
                          first_seen: rule.last_evaluated,
                          region: undefined,
                          metadata: {
                            ...(rule.compliance_status ? { "Status": rule.compliance_status } : {}),
                            ...(rule.name ? { "Rule": rule.name } : {}),
                            ...(rule.resource_type ? { "Resource Type": rule.resource_type } : {}),
                          },
                        }}
                        workflow={workflows[rule.id]}
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
