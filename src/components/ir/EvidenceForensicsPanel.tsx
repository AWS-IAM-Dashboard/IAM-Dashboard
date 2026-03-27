/**
 * EvidenceForensicsPanel — shows forensics captures and evidence vault state
 * for a finding. Fetches from /api/ir/forensics/{id} and /api/ir/evidence/{id}.
 *
 * Displays:
 *   - EBS snapshot ID + status
 *   - Memory dump job status + S3 URI
 *   - Athena query ID, status, results link, scanned bytes
 *   - S3 Object Lock mode + retain-until date
 *   - Cross-region replication status
 *   - Chain-of-custody timeline
 *   - Download/export controls
 */

import { useState, useEffect } from "react";
import {
  HardDrive,
  Camera,
  Database,
  Lock,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Shield,
} from "lucide-react";

import type { ForensicsCapture, EvidenceRecord, CustodyEvent } from "../../types/ir";
import { getForensicsData, getEvidenceRecord } from "../../services/irEngine";
import type { FindingData } from "../ui/FindingDetailPanel";

// ─── Props ────────────────────────────────────────────────────────────────────

interface EvidenceForensicsPanelProps {
  finding: FindingData;
}

// ─── Style atoms ─────────────────────────────────────────────────────────────

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

const ls: React.CSSProperties = {
  ...mono,
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "rgba(100,116,139,0.55)",
};

// ─── Snapshot status chip ─────────────────────────────────────────────────────

const SNAP_STATUS_META = {
  pending:   { color: "#60a5fa",  label: "Pending"   },
  creating:  { color: "#ffb000",  label: "Creating"  },
  available: { color: "#00ff88",  label: "Available" },
  error:     { color: "#ff0040",  label: "Error"     },
};

const ATHENA_STATUS_META: Record<string, { color: string; label: string }> = {
  QUEUED:    { color: "#60a5fa",  label: "Queued"    },
  RUNNING:   { color: "#ffb000",  label: "Running"   },
  SUCCEEDED: { color: "#00ff88",  label: "Succeeded" },
  FAILED:    { color: "#ff0040",  label: "Failed"    },
  CANCELLED: { color: "#64748b",  label: "Cancelled" },
};

const DUMP_STATUS_META: Record<string, { color: string; label: string }> = {
  pending:  { color: "#60a5fa",  label: "Pending"  },
  running:  { color: "#ffb000",  label: "Running"  },
  complete: { color: "#00ff88",  label: "Complete" },
  failed:   { color: "#ff0040",  label: "Failed"   },
};

function StatusPill({ color, label }: { color: string; label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 8px",
        borderRadius: 999,
        background: `${color}18`,
        border: `1px solid ${color}35`,
        fontSize: 10,
        fontWeight: 700,
        color,
        ...mono,
        letterSpacing: "0.04em",
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {label}
    </span>
  );
}

// ─── Value row ────────────────────────────────────────────────────────────────

function ValRow({ label, value, mono: useMono = true }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 8, alignItems: "start" }}>
      <span style={{ ...ls, fontSize: 9 }}>{label}</span>
      <span
        style={{
          ...(useMono ? mono : {}),
          fontSize: 11,
          color: "#94a3b8",
          wordBreak: "break-all",
          lineHeight: 1.5,
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Custody timeline ─────────────────────────────────────────────────────────

function CustodyTimeline({ events }: { events: CustodyEvent[] }) {
  const ACTION_COLORS: Record<string, string> = {
    created:     "#00ff88",
    accessed:    "#60a5fa",
    transferred: "#a78bfa",
    exported:    "#ffb000",
    verified:    "#00ff88",
    replicated:  "#38bdf8",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {events.map((event, i) => {
        const color = ACTION_COLORS[event.action] ?? "#94a3b8";
        return (
          <div key={event.id} style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: 10 }}>
            {/* Connector */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: color,
                  flexShrink: 0,
                  marginTop: 4,
                }}
              />
              {i < events.length - 1 && (
                <div style={{ width: 1, flex: 1, background: "rgba(255,255,255,0.06)", marginTop: 2, marginBottom: 0, minHeight: 16 }} />
              )}
            </div>

            {/* Content */}
            <div style={{ paddingBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    ...mono,
                    fontSize: 10,
                    fontWeight: 700,
                    color,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.04em",
                  }}
                >
                  {event.action}
                </span>
                {event.integrity_verified && (
                  <ShieldCheck size={10} color="#00ff88" title="Integrity verified" />
                )}
                <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.35)", marginLeft: "auto" }}>
                  {new Date(event.timestamp).toLocaleString()}
                </span>
              </div>
              <p style={{ fontSize: 11, color: "rgba(148,163,184,0.7)", margin: "2px 0 0", lineHeight: 1.4 }}>
                {event.details}
              </p>
              <span style={{ ...mono, fontSize: 10, color: "rgba(100,116,139,0.45)" }}>
                {event.actor}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Bytes formatter ──────────────────────────────────────────────────────────

function fmtBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${bytes} B`;
}

// ─── Lock mode display ────────────────────────────────────────────────────────

function LockModeBadge({ mode }: { mode: "GOVERNANCE" | "COMPLIANCE" }) {
  const isCompliance = mode === "COMPLIANCE";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 8px",
        borderRadius: 4,
        background: isCompliance ? "rgba(255,0,64,0.08)" : "rgba(255,176,0,0.08)",
        border: `1px solid ${isCompliance ? "rgba(255,0,64,0.22)" : "rgba(255,176,0,0.22)"}`,
        color: isCompliance ? "#ff4060" : "#ffb000",
        fontSize: 10,
        fontWeight: 700,
        ...mono,
        letterSpacing: "0.04em",
      }}
    >
      <Lock size={9} />
      {mode}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EvidenceForensicsPanel({ finding }: EvidenceForensicsPanelProps) {
  const [forensics, setForensics] = useState<ForensicsCapture | null>(null);
  const [evidence, setEvidence] = useState<EvidenceRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [f, e] = await Promise.all([
        getForensicsData(finding.id, finding.region ?? "us-east-1"),
        getEvidenceRecord(finding.id),
      ]);
      setForensics(f);
      setEvidence(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [finding.id]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "24px 0", color: "rgba(100,116,139,0.5)" }}>
        <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: 12 }}>Loading evidence record…</span>
      </div>
    );
  }

  if (!forensics && !evidence) {
    return (
      <div
        style={{
          padding: "16px",
          borderRadius: 8,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          textAlign: "center",
        }}
      >
        <Shield size={20} color="rgba(100,116,139,0.3)" style={{ margin: "0 auto 8px" }} />
        <p style={{ fontSize: 12, color: "rgba(100,116,139,0.5)", margin: 0 }}>
          No evidence collected yet. Run forensics captures from the IR Engine tab.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* ── FORENSICS CAPTURES ────────────────────────────────────────────── */}
      {forensics && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            background: "rgba(56,189,248,0.04)",
            border: "1px solid rgba(56,189,248,0.14)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 5,
                background: "rgba(56,189,248,0.14)",
                border: "1px solid rgba(56,189,248,0.28)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Camera size={11} color="#38bdf8" />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#38bdf8", ...mono }}>
              Forensics Captures
            </span>
            {forensics.captured_at && (
              <span style={{ ...mono, fontSize: 10, color: "rgba(56,189,248,0.4)", marginLeft: "auto" }}>
                {new Date(forensics.captured_at).toLocaleString()}
              </span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* EBS Snapshot */}
            {forensics.snapshot_id && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <HardDrive size={12} color="#94a3b8" />
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0" }}>EBS Snapshot</span>
                  {forensics.snapshot_status && (
                    <StatusPill {...SNAP_STATUS_META[forensics.snapshot_status]} />
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <ValRow label="Snapshot ID" value={forensics.snapshot_id} />
                  {forensics.snapshot_arn && <ValRow label="ARN" value={forensics.snapshot_arn} />}
                  {forensics.snapshot_size_gb && (
                    <ValRow label="Size" value={`${forensics.snapshot_size_gb} GB`} />
                  )}
                  {forensics.region && <ValRow label="Region" value={forensics.region} />}
                </div>
              </div>
            )}

            {/* Memory Dump */}
            {forensics.memory_dump_job_id && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Camera size={12} color="#94a3b8" />
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0" }}>Memory Dump</span>
                  {forensics.memory_dump_status && (
                    <StatusPill {...DUMP_STATUS_META[forensics.memory_dump_status]} />
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <ValRow label="Job ID" value={forensics.memory_dump_job_id} />
                  {forensics.memory_dump_s3_uri && <ValRow label="S3 URI" value={forensics.memory_dump_s3_uri} />}
                  {forensics.memory_dump_size_mb && (
                    <ValRow label="Size" value={`${forensics.memory_dump_size_mb} MB`} />
                  )}
                </div>
              </div>
            )}

            {/* Athena Query */}
            {forensics.athena_query_id && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Database size={12} color="#94a3b8" />
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0" }}>Athena Log Query</span>
                  {forensics.athena_query_status && (
                    <StatusPill {...ATHENA_STATUS_META[forensics.athena_query_status]} />
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <ValRow label="Query ID" value={forensics.athena_query_id} />
                  {forensics.athena_scanned_bytes !== undefined && (
                    <ValRow label="Scanned" value={fmtBytes(forensics.athena_scanned_bytes)} />
                  )}
                  {forensics.athena_execution_time_ms && (
                    <ValRow label="Exec Time" value={`${(forensics.athena_execution_time_ms / 1000).toFixed(2)}s`} />
                  )}
                  {forensics.athena_results_uri && (
                    <ValRow
                      label="Results"
                      value={
                        <a
                          href={forensics.athena_results_uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#38bdf8", display: "inline-flex", alignItems: "center", gap: 4 }}
                        >
                          View results <ExternalLink size={10} />
                        </a>
                      }
                      mono={false}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EVIDENCE VAULT ────────────────────────────────────────────────── */}
      {evidence && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            background: "rgba(167,139,250,0.04)",
            border: "1px solid rgba(167,139,250,0.14)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 5,
                background: "rgba(167,139,250,0.14)",
                border: "1px solid rgba(167,139,250,0.28)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Lock size={11} color="#a78bfa" />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", ...mono }}>
              Evidence Vault
            </span>
            {evidence.preserved_at && (
              <span style={{ ...mono, fontSize: 10, color: "rgba(167,139,250,0.4)", marginLeft: "auto" }}>
                {new Date(evidence.preserved_at).toLocaleString()}
              </span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Object Lock + Replication */}
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {evidence.s3_object_lock_mode && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ ...ls, fontSize: 9 }}>Object Lock</span>
                  <LockModeBadge mode={evidence.s3_object_lock_mode} />
                </div>
              )}
              {evidence.s3_object_lock_retain_until && (
                <ValRow
                  label="Retain Until"
                  value={new Date(evidence.s3_object_lock_retain_until).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                />
              )}
              {evidence.s3_replication_status && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ ...ls, fontSize: 9 }}>Replication</span>
                  <StatusPill
                    color={evidence.s3_replication_status === "COMPLETE" ? "#00ff88" : "#ffb000"}
                    label={evidence.s3_replication_status}
                  />
                </div>
              )}
              {evidence.s3_replication_destination && (
                <ValRow label="Destination" value={evidence.s3_replication_destination} />
              )}
            </div>

            {/* S3 location + integrity */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {evidence.s3_bucket && <ValRow label="S3 Bucket" value={evidence.s3_bucket} />}
              {evidence.s3_key && <ValRow label="S3 Key" value={evidence.s3_key} />}
              {evidence.hash_sha256 && (
                <ValRow
                  label="SHA-256"
                  value={
                    <span title={evidence.hash_sha256}>
                      {evidence.hash_sha256.slice(0, 24)}…
                      <CheckCircle2 size={10} color="#00ff88" style={{ marginLeft: 4, verticalAlign: "middle" }} />
                    </span>
                  }
                  mono={false}
                />
              )}
              {evidence.size_bytes !== undefined && (
                <ValRow label="Size" value={fmtBytes(evidence.size_bytes)} />
              )}
            </div>

            {/* Export controls */}
            <div style={{ display: "flex", gap: 6 }}>
              {evidence.report_download_url && (
                <a
                  href={evidence.report_download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: "rgba(167,139,250,0.1)",
                    border: "1px solid rgba(167,139,250,0.25)",
                    color: "#a78bfa",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    textDecoration: "none",
                    ...mono,
                    transition: "background 0.1s, border-color 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = "rgba(167,139,250,0.16)";
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(167,139,250,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = "rgba(167,139,250,0.1)";
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(167,139,250,0.25)";
                  }}
                >
                  <Download size={11} />
                  Incident Report
                </a>
              )}
              <button
                onClick={load}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "6px 10px",
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(100,116,139,0.55)",
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                  ...mono,
                }}
              >
                <RefreshCw size={10} />
                Refresh
              </button>
            </div>

            {/* Chain of custody */}
            {evidence.chain_of_custody.length > 0 && (
              <div>
                <div style={{ ...ls, marginBottom: 8 }}>Chain of Custody</div>
                <CustodyTimeline events={evidence.chain_of_custody} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
