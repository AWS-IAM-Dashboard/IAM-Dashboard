// At Rest — encryption coverage, public snapshots
import { useState, useEffect } from "react";
import { HardDrive, ChevronDown, ChevronRight, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import type { StorageEncryptionEntry, PublicSnapshot } from "./types";
import {
  mono, divider,
  ComplianceChip, MockBadge, BackendHandoff,
  ModuleHeader, StatStrip, DPScenarioSimulator, EvidenceAuditCard, TH,
} from "./shared";
import { MOCK_STORAGE_ENCRYPTION, MOCK_PUBLIC_SNAPSHOTS, MOCK_AUDIT_TRAIL, DP_SCENARIOS } from "./mockData";

const AT_REST_ENDPOINTS = [
  { method: "GET", path: "GET /s3/buckets/{bucket}/encryption", description: "S3 bucket server-side encryption configuration" },
  { method: "GET", path: "GET /ec2/volumes", description: "EBS volume encryption status and KMS key" },
  { method: "GET", path: "GET /rds/db-instances", description: "RDS instance encryption and backup config" },
  { method: "GET", path: "GET /ec2/snapshots?owner=self&restorable-by=all", description: "Detect publicly restorable EBS snapshots" },
  { method: "PUT", path: "PUT /s3/buckets/{bucket}/encryption", description: "Enable SSE-KMS on S3 bucket (simulation)" },
  { method: "POST", path: "POST /ec2/modify-snapshot-attribute", description: "Remove public snapshot permission (simulation)" },
];

const CLASSIFICATION_COLOR: Record<string, string> = {
  CRITICAL: "#ff0040", SENSITIVE: "#ff6b35", INTERNAL: "#ffb000", PUBLIC: "#64748b",
};

const ALGO_COLOR: Record<string, string> = {
  "aws:kms": "#00ff88", "SSE-KMS": "#00ff88", "AES-256": "#38bdf8",
  "SSE-S3": "#ffb000", "SSE-C": "#a78bfa", "NONE": "#ff0040",
};

function EncRow({ entry }: { entry: StorageEncryptionEntry }) {
  const [open, setOpen] = useState(false);
  const cc = entry.compliance === "compliant" ? "#00ff88" : entry.compliance === "non_compliant" ? "#ff0040" : "#ffb000";
  return (
    <>
      <div
        className="soc-row"
        style={{ display: "grid", gridTemplateColumns: "24px 80px 130px 80px 80px 100px 60px 100px", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: divider, cursor: "pointer", borderLeft: `2px solid ${open ? cc : "transparent"}`, transition: "border-color 0.15s" }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ color: "rgba(100,116,139,0.4)", display: "flex" }}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
        <span style={{ ...mono, fontSize: 9.5, padding: "0 6px", height: 16, display: "inline-flex", alignItems: "center", borderRadius: 999, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(100,116,139,0.65)" }}>{entry.resource_type}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{entry.resource_name}</div>
          <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.4)", marginTop: 1 }}>{entry.region}</div>
        </div>
        <span style={{ ...mono, fontSize: 9.5, fontWeight: 700, color: ALGO_COLOR[entry.algorithm] ?? "#64748b" }}>{entry.algorithm}</span>
        <span style={{ ...mono, fontSize: 9, color: entry.kms_key_alias ? "rgba(0,255,136,0.65)" : "rgba(100,116,139,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{entry.kms_key_alias ?? "No CMK"}</span>
        <span style={{ ...mono, fontSize: 9.5, fontWeight: 700, color: CLASSIFICATION_COLOR[entry.data_classification] ?? "#94a3b8" }}>{entry.data_classification}</span>
        <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: entry.public_accessible ? "#ff0040" : "rgba(0,255,136,0.5)" }}>{entry.public_accessible ? "PUBLIC" : "Private"}</span>
        <div style={{ display: "flex", justifyContent: "flex-end" }}><ComplianceChip status={entry.compliance} small /></div>
      </div>
      {open && (
        <div style={{ padding: "12px 16px 14px", borderBottom: divider, background: "rgba(0,0,0,0.12)", animation: "fade-in 0.15s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 12 }}>
            {[
              { l: "Resource ID", v: entry.resource_id },
              { l: "Encryption", v: entry.encrypted ? "Enabled" : "Disabled" },
              { l: "Algorithm", v: entry.algorithm },
              { l: "KMS Key", v: entry.kms_key_alias ?? "None (AWS managed or no CMK)" },
              { l: "Public Access", v: entry.public_accessible ? "YES — RISK" : "No" },
              { l: "Classification", v: entry.data_classification },
            ].map(({ l, v }) => (
              <div key={l}>
                <div style={{ ...mono, fontSize: 8.5, color: "rgba(100,116,139,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{l}</div>
                <div style={{ ...mono, fontSize: 10, color: l === "Public Access" && entry.public_accessible ? "#ff0040" : "#e2e8f0", marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function SnapshotRow({ snap }: { snap: PublicSnapshot }) {
  const sc = snap.severity === "CRITICAL" ? "#ff0040" : "#ff6b35";
  return (
    <div className="soc-row" style={{ display: "grid", gridTemplateColumns: "100px 160px 80px 80px 80px 80px 1fr", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: divider }}>
      <span style={{ display: "inline-flex", alignItems: "center", padding: "0 8px", height: 18, borderRadius: 999, background: `${sc}12`, border: `1px solid ${sc}2e`, color: sc, fontSize: 10, fontWeight: 700, ...mono }}>{snap.severity}</span>
      <span style={{ ...mono, fontSize: 9.5, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{snap.snapshot_id}</span>
      <span style={{ ...mono, fontSize: 9.5, color: "rgba(100,116,139,0.65)" }}>{snap.resource_type}</span>
      <span style={{ ...mono, fontSize: 9.5, color: "rgba(148,163,184,0.6)" }}>{snap.size_gb} GB</span>
      <span style={{ ...mono, fontSize: 9.5, fontWeight: 700, color: snap.encrypted ? "#00ff88" : "#ff0040" }}>{snap.encrypted ? "ENC" : "PLAIN"}</span>
      <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.4)" }}>{new Date(snap.created_at).toLocaleDateString()}</span>
      <span style={{ fontSize: 10, color: "rgba(100,116,139,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{snap.description}</span>
    </div>
  );
}

export function AtRest() {
  const [section, setSection] = useState<"encryption" | "snapshots" | "audit" | "scenarios">("encryption");

  const compliant = MOCK_STORAGE_ENCRYPTION.filter(e => e.compliance === "compliant").length;
  const nonCompliant = MOCK_STORAGE_ENCRYPTION.filter(e => e.compliance === "non_compliant").length;
  const hasCMK = MOCK_STORAGE_ENCRYPTION.filter(e => e.kms_key_id).length;
  const publicResources = MOCK_STORAGE_ENCRYPTION.filter(e => e.public_accessible).length;

  const SECTIONS = [
    { id: "encryption", label: "Encryption Coverage", shortLabel: "Encrypt", accent: "#38bdf8", count: nonCompliant },
    { id: "snapshots", label: "Public Snapshots", shortLabel: "Public", accent: "#ff0040", count: MOCK_PUBLIC_SNAPSHOTS.length },
    { id: "audit", label: "Audit Trail", shortLabel: "Audit", accent: "#a78bfa" },
    { id: "scenarios", label: "Scenarios", shortLabel: "SIM", accent: "#ffb000" },
  ] as const;

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="min-w-0 max-w-full" style={{ display: "flex", flexDirection: "column" as const }}>
      <ModuleHeader icon={<HardDrive size={16} color="#8b5cf6" />} title="At Rest" subtitle="Storage encryption coverage, CMK adoption, and public snapshot exposure" accent="#8b5cf6" />

      <StatStrip stats={[
        { label: "Compliant", value: compliant, color: "#00ff88", accent: true },
        { label: "Non-Compliant", value: nonCompliant, color: nonCompliant > 0 ? "#ff0040" : "#00ff88", accent: nonCompliant > 0 },
        { label: "CMK Encrypted", value: hasCMK, color: "#00ff88" },
        { label: "Public Resources", value: publicResources, color: publicResources > 0 ? "#ff0040" : "#00ff88", accent: publicResources > 0 },
        { label: "Public Snapshots", value: MOCK_PUBLIC_SNAPSHOTS.length, color: MOCK_PUBLIC_SNAPSHOTS.length > 0 ? "#ff0040" : "#00ff88", accent: MOCK_PUBLIC_SNAPSHOTS.length > 0 },
        { label: "Total Resources", value: MOCK_STORAGE_ENCRYPTION.length },
      ]} />

      <div className="mb-3 grid min-w-0 w-full grid-cols-4 gap-1 sm:flex sm:flex-wrap sm:gap-2">
        {SECTIONS.map(s => {
          const active = section === s.id;
          return (
            <button
              key={s.id}
              type="button"
              className="soc-btn flex min-w-0 w-full flex-col items-center justify-center gap-0.5 rounded-md px-0.5 py-2 text-center sm:w-auto sm:flex-row sm:gap-1.5 sm:px-2.5 sm:py-1.5"
              onClick={() => setSection(s.id as typeof section)}
              style={{
                background: active ? `${s.accent}12` : "transparent",
                border: `1px solid ${active ? s.accent + "30" : "rgba(255,255,255,0.06)"}`,
                color: active ? s.accent : "rgba(100,116,139,0.5)", cursor: "pointer", ...mono,
                fontSize: isMobile ? 9 : 11, fontWeight: active ? 700 : 500, transition: "all 0.12s",
              }}
            >
              <span className="hidden whitespace-nowrap sm:inline">{s.label}</span>
              <span className="max-w-full truncate text-[8px] leading-tight sm:hidden">{s.shortLabel}</span>
              {("count" in s) && s.count > 0 && (
                <span style={{ ...mono, fontSize: 8, fontWeight: 800, padding: "0 3px", minHeight: 14, display: "inline-flex", alignItems: "center", borderRadius: 999, background: `${s.accent}18`, border: `1px solid ${s.accent}30`, color: s.accent }}>{s.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {section === "encryption" && (
        <div className="min-w-0 overflow-x-auto" style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ minWidth: 760 }}>
            <div style={{ display: "grid", gridTemplateColumns: "24px 80px 130px 80px 80px 100px 60px 100px", gap: 8, padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
              <span /><TH>Type</TH><TH>Resource</TH><TH>Algorithm</TH><TH>KMS Key</TH><TH>Class</TH><TH>Access</TH><TH right>Status</TH>
            </div>
            {MOCK_STORAGE_ENCRYPTION.map(e => <EncRow key={e.id} entry={e} />)}
          </div>
        </div>
      )}

      {section === "snapshots" && (
        <div style={{ borderRadius: 8, border: "1px solid rgba(255,0,64,0.2)", overflow: "hidden" }}>
          <div style={{ padding: "8px 14px", borderBottom: "1px solid rgba(255,0,64,0.12)", background: "rgba(255,0,64,0.04)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <AlertTriangle size={12} color="#ff0040" />
            <span style={{ fontSize: 11, color: "rgba(255,0,64,0.8)" }}>Public snapshots are immediately accessible to any AWS account — treat as data breach risk.</span>
            <MockBadge />
          </div>
          <div className="min-w-0 overflow-x-auto">
            <div style={{ minWidth: 720 }}>
              <div style={{ display: "grid", gridTemplateColumns: "100px 160px 80px 80px 80px 80px 1fr", gap: 8, padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
                <TH>Severity</TH><TH>Snapshot ID</TH><TH>Type</TH><TH>Size</TH><TH>Encrypted</TH><TH>Created</TH><TH>Description</TH>
              </div>
              {MOCK_PUBLIC_SNAPSHOTS.map(s => <SnapshotRow key={s.id} snap={s} />)}
            </div>
          </div>
        </div>
      )}

      {section === "audit" && (
        <div className="min-w-0 max-w-full px-1 py-1 sm:px-0">
          {MOCK_AUDIT_TRAIL.filter(e => ["dev-scratch-bucket", "snap-0abc1234def56789", "mrk-ebs456"].includes(e.resource_id)).map(e => (
            <EvidenceAuditCard key={e.id} event={e} />
          ))}
        </div>
      )}

      {section === "scenarios" && (
        <div className="flex min-w-0 max-w-full flex-col gap-3 px-1 py-1 sm:gap-3 sm:px-0">
          {DP_SCENARIOS.filter(s => s.id === "unencrypted_storage" || s.id === "public_snapshot").map(s => (
            <DPScenarioSimulator key={s.id} scenario={s} />
          ))}
        </div>
      )}

      <BackendHandoff endpoints={AT_REST_ENDPOINTS} />
    </div>
  );
}
