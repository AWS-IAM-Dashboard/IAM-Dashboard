import { useState } from "react";
import {
  Eye,
  Database,
  AlertTriangle,
  RefreshCw,
  Download,
  Shield,
  Key,
  User,
  CreditCard,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

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
    padding: '2px 8px',
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
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24, color: '#e2e8f0' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Eye size={28} color="#ff0040" />
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: '#e2e8f0' }}>Macie</h1>
          </div>
          <p style={{ margin: '6px 0 0', color: 'rgba(100,116,139,0.7)', fontSize: 14 }}>
            Automated sensitive data discovery and DLP — PII, credentials, and financial data in S3
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: '#e2e8f0', cursor: isRefreshing ? 'not-allowed' : 'pointer',
              opacity: isRefreshing ? 0.6 : 1,
            }}
          >
            <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: '#e2e8f0', cursor: 'pointer',
            }}
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        <div style={CARD_STYLE}>
          <p style={{ fontSize: 12, color: 'rgba(100,116,139,0.7)', margin: 0, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Findings</p>
          <p style={{ fontSize: 30, fontWeight: 700, margin: 0, color: '#e2e8f0' }}>{totalFindings}</p>
          <p style={{ fontSize: 12, color: 'rgba(100,116,139,0.7)', margin: '4px 0 0' }}>all findings</p>
        </div>

        <div style={{ ...CARD_STYLE, borderColor: 'rgba(255,0,64,0.18)' }}>
          <p style={{ fontSize: 12, color: 'rgba(100,116,139,0.7)', margin: 0, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>PII Exposed</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ fontSize: 30, fontWeight: 700, margin: 0, color: '#ff4060' }}>{piiExposed}</p>
            <User size={18} color="#ff4060" style={{ opacity: 0.7 }} />
          </div>
          <p style={{ fontSize: 12, color: 'rgba(100,116,139,0.7)', margin: '4px 0 0' }}>PII findings</p>
        </div>

        <div style={{ ...CARD_STYLE, borderColor: 'rgba(255,0,64,0.18)' }}>
          <p style={{ fontSize: 12, color: 'rgba(100,116,139,0.7)', margin: 0, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Credentials Found</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ fontSize: 30, fontWeight: 700, margin: 0, color: '#ff4060' }}>{credentialsFound}</p>
            <Key size={18} color="#ff4060" style={{ opacity: 0.7 }} />
          </div>
          <p style={{ fontSize: 12, color: 'rgba(100,116,139,0.7)', margin: '4px 0 0' }}>credential leaks</p>
        </div>

        <div style={{ ...CARD_STYLE, borderColor: 'rgba(255,176,0,0.18)' }}>
          <p style={{ fontSize: 12, color: 'rgba(100,116,139,0.7)', margin: 0, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Buckets Affected</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ fontSize: 30, fontWeight: 700, margin: 0, color: '#ffb000' }}>{bucketsAffected}</p>
            <Database size={18} color="#ffb000" style={{ opacity: 0.7 }} />
          </div>
          <p style={{ fontSize: 12, color: 'rgba(100,116,139,0.7)', margin: '4px 0 0' }}>unique buckets</p>
        </div>
      </div>

      {/* Data Type Legend */}
      <div style={{ ...CARD_STYLE, padding: '14px 24px' }}>
        <p style={{ fontSize: 11, color: 'rgba(100,116,139,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Discovered Data Types</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {DATA_TYPE_LEGEND.map(dt => (
            <span
              key={dt.label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 10px',
                borderRadius: 12,
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
      <div style={CARD_STYLE}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>Data Sensitivity Findings</span>
          <span style={{ fontSize: 12, color: 'rgba(100,116,139,0.7)' }}>
            {filteredFindings.length} finding{filteredFindings.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '6px 170px 1fr 140px 130px 80px 90px 30px',
          gap: 12,
          padding: '0 12px 10px',
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
                <div
                  onClick={() => setExpandedId(isExpanded ? null : finding.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '6px 170px 1fr 140px 130px 80px 90px 30px',
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
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 600,
                      background: classStyle.bg,
                      border: `1px solid ${classStyle.border}`,
                      color: classStyle.text,
                    }}>
                      {finding.data_classification}
                    </span>
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
                  <div style={{
                    padding: '16px 24px 20px',
                    background: 'rgba(0,0,0,0.25)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}>
                    <div>
                      <p style={{ fontSize: 11, color: 'rgba(100,116,139,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Finding Title</p>
                      <p style={{ fontSize: 13, color: '#e2e8f0', margin: 0, fontWeight: 500 }}>{finding.title}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: 'rgba(100,116,139,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Description</p>
                      <p style={{ fontSize: 13, color: '#e2e8f0', margin: 0 }}>{finding.description}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ fontSize: 11, color: 'rgba(100,116,139,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Object Key</p>
                        <p style={{ fontSize: 12, color: '#00ff88', margin: 0, fontFamily: '"JetBrains Mono", monospace', wordBreak: 'break-all' }}>{finding.object_key}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 11, color: 'rgba(100,116,139,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>All Sensitive Types</p>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                          {pills.map(p => (
                            <span key={p} style={getDataTypePillStyle(p)}>{p}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 32 }}>
                      <div>
                        <p style={{ fontSize: 11, color: 'rgba(100,116,139,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>First Observed</p>
                        <p style={{ fontSize: 12, color: '#e2e8f0', margin: 0 }}>{formatDate(finding.first_observed_at)}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 11, color: 'rgba(100,116,139,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Last Observed</p>
                        <p style={{ fontSize: 12, color: '#e2e8f0', margin: 0 }}>{formatDate(finding.last_observed_at)}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 11, color: 'rgba(100,116,139,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Category</p>
                        <p style={{ fontSize: 12, color: '#e2e8f0', margin: 0 }}>{finding.category}</p>
                      </div>
                    </div>
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: 8,
                      background: 'rgba(255,0,64,0.05)',
                      border: '1px solid rgba(255,0,64,0.18)',
                    }}>
                      <p style={{ fontSize: 11, color: '#ff0040', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px', fontWeight: 600 }}>Remediation</p>
                      <p style={{ fontSize: 13, color: '#e2e8f0', margin: 0 }}>
                        {getRemediation(finding.category)}
                      </p>
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
