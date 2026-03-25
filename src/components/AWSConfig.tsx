import { useState } from "react";
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
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24, color: '#e2e8f0' }}>

      <ScanPageHeader
        icon={<Settings size={20} color="#00ff88" />}
        iconColor="#00ff88"
        title="AWS Config"
        subtitle="Continuous configuration compliance evaluation and drift detection across your AWS resources"
        isScanning={isRefreshing}
        onRefresh={handleRefresh}
      />

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        <StatCard label="Total Rules" value={summary.total_rules} accent="#e2e8f0" icon={Settings2} />
        <StatCard label="Compliant" value={summary.compliant_rules} accent="#00ff88" icon={CheckCircle2} />
        <StatCard label="Non-Compliant" value={summary.non_compliant_rules} accent="#ff0040" icon={XCircle} />
        <StatCard label="Compliance" value={`${summary.compliance_percentage}%`} accent={complianceColor} />
      </div>

      {/* Progress Bar */}
      <div style={CARD_STYLE}>
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
        <div style={{
          display: 'grid',
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
                <div
                  onClick={() => setExpandedId(isExpanded ? null : rule.id)}
                  style={{
                    display: 'grid',
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
                  <div style={{
                    padding: '16px 24px 20px',
                    background: 'rgba(0,0,0,0.25)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}>
                    <div>
                      <p style={{ fontSize: 11, color: 'rgba(100,116,139,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Description</p>
                      <p style={{ fontSize: 13, color: '#e2e8f0', margin: 0 }}>{rule.description}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 32 }}>
                      <div>
                        <p style={{ fontSize: 11, color: 'rgba(100,116,139,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Resource Count</p>
                        <p style={{ fontSize: 13, color: '#e2e8f0', margin: 0 }}>{rule.resource_count} resource{rule.resource_count !== 1 ? 's' : ''}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 11, color: 'rgba(100,116,139,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Rule ID</p>
                        <p style={{ fontSize: 12, color: '#e2e8f0', margin: 0, fontFamily: '"JetBrains Mono", monospace' }}>{rule.id}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 11, color: 'rgba(100,116,139,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Status</p>
                        <SeverityBadge severity={rule.compliance_status} size="sm" />
                      </div>
                    </div>
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: 8,
                      background: 'rgba(255,176,0,0.06)',
                      border: '1px solid rgba(255,176,0,0.18)',
                    }}>
                      <p style={{ fontSize: 11, color: '#ffb000', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px', fontWeight: 600 }}>Remediation</p>
                      <p style={{ fontSize: 13, color: '#e2e8f0', margin: 0 }}>{getRemediationHint(rule.name)}</p>
                    </div>
                  </div>
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
