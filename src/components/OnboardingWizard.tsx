import { useState, useEffect } from "react";
import {
  X, Shield, LayoutDashboard, Users, Layers, Eye,
  Activity, BookOpen, Settings, ChevronRight, Play,
  CheckCircle2, Zap, FileText, Server, Archive,
  Network, Database,
} from "lucide-react";

// ─── CSS animations injected once ───────────────────────────────────────────
const CSS = `
  @keyframes ob-fade-up {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes ob-scale-in {
    from { opacity: 0; transform: scale(0.92); }
    to   { opacity: 1; transform: scale(1);    }
  }
  @keyframes ob-slide-in {
    from { opacity: 0; transform: translateX(12px); }
    to   { opacity: 1; transform: translateX(0);    }
  }
  @keyframes ob-bar-grow {
    from { width: 0; }
    to   { width: var(--bar-w, 60%); }
  }
  @keyframes ob-count {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0);   }
  }
  @keyframes ob-pulse {
    0%,100% { opacity: 1; transform: scale(1);    }
    50%     { opacity: 0.45; transform: scale(0.9); }
  }
  @keyframes ob-ring {
    from { stroke-dashoffset: 252; }
    to   { stroke-dashoffset: var(--ring-offset, 80); }
  }
  @keyframes ob-float {
    0%,100% { transform: translateY(0);   }
    50%      { transform: translateY(-5px); }
  }
  @keyframes ob-ping {
    0%   { transform: scale(1);   opacity: 0.7; }
    100% { transform: scale(1.9); opacity: 0;   }
  }
  @keyframes ob-sparkbar {
    from { height: 2px; }
    to   { height: var(--spark-h, 16px); }
  }
  .ob-fi { animation: ob-fade-up 0.35s ease both; }
  .ob-fi:nth-child(1) { animation-delay: 0.08s; }
  .ob-fi:nth-child(2) { animation-delay: 0.16s; }
  .ob-fi:nth-child(3) { animation-delay: 0.24s; }
  .ob-fi:nth-child(4) { animation-delay: 0.32s; }
`;

// ─── PREVIEW COMPONENTS ──────────────────────────────────────────────────────

function WelcomePreview() {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(0,255,136,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.035) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      {/* Animated shield */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", animation: "ob-float 3.2s ease-in-out infinite" }}>
        <div style={{ position: "absolute", width: 110, height: 110, borderRadius: "50%", border: "1px solid rgba(0,255,136,0.25)", animation: "ob-ping 2s ease-out infinite" }} />
        <div style={{ position: "absolute", width: 110, height: 110, borderRadius: "50%", border: "1px solid rgba(0,255,136,0.15)", animation: "ob-ping 2s ease-out 0.65s infinite" }} />
        <div style={{ position: "absolute", width: 110, height: 110, borderRadius: "50%", border: "1px solid rgba(0,255,136,0.08)", animation: "ob-ping 2s ease-out 1.3s infinite" }} />
        <div style={{ width: 68, height: 68, borderRadius: 14, background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.35)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 32px rgba(0,255,136,0.18), inset 0 1px 0 rgba(0,255,136,0.15)" }}>
          <Shield size={30} color="#00ff88" />
        </div>
      </div>
      {/* Left stats */}
      <div style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: 7, animation: "ob-fade-up 0.45s ease 0.3s both" }}>
        {([["11","CRITICAL","#ff0040"],["22","HIGH","#ff6b35"],["38","MEDIUM","#ffb000"]] as const).map(([n, l, c]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, fontWeight: 700, color: c }}>{n}</span>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "rgba(100,116,139,0.6)", letterSpacing: "0.1em" }}>{l}</span>
          </div>
        ))}
      </div>
      {/* Bottom label */}
      <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", fontFamily: "JetBrains Mono, monospace", fontSize: 9, letterSpacing: "0.3em", color: "rgba(0,255,136,0.5)", animation: "ob-fade-up 0.4s ease 0.55s both", whiteSpace: "nowrap" }}>
        IAM ARGUS · INITIALIZED · READY
      </div>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div style={{ width: "100%", height: "100%", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Top action row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, animation: "ob-fade-up 0.3s ease both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 5, background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.28)" }}>
          <Play size={10} color="#00ff88" />
          <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: 10, fontWeight: 600, color: "#00ff88" }}>Full Security Scan</span>
        </div>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "rgba(100,116,139,0.45)" }}>Last: 2m ago</div>
        <div style={{ marginLeft: "auto", padding: "3px 7px", borderRadius: 4, background: "rgba(255,176,0,0.08)", border: "1px solid rgba(255,176,0,0.2)" }}>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "#ffb000", letterSpacing: "0.07em" }}>IR MODE</span>
        </div>
      </div>
      {/* KPI grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {([["OPEN FINDINGS","89","#e2e8f0","0.1s"],["CRITICAL","11","#ff0040","0.18s"],["HIGH","22","#ff6b35","0.26s"],["COMPLIANCE","71%","#00ff88","0.34s"]] as const).map(([l, v, c, d]) => (
          <div key={l} style={{ padding: "7px 9px", borderRadius: 5, background: "rgba(15,23,42,0.7)", border: "1px solid rgba(255,255,255,0.06)", animation: `ob-count 0.4s ease ${d} both` }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "rgba(100,116,139,0.55)", letterSpacing: "0.08em", marginBottom: 2 }}>{l}</div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 20, fontWeight: 700, color: c, lineHeight: 1 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IAMPreview() {
  const bars = [
    { label: "CRITICAL", pct: 40,  color: "#ff0040", count: 2 },
    { label: "HIGH",     pct: 70,  color: "#ff6b35", count: 5 },
    { label: "MEDIUM",   pct: 50,  color: "#ffb000", count: 3 },
    { label: "LOW",      pct: 8,   color: "#00ff88", count: 0 },
  ];
  return (
    <div style={{ width: "100%", height: "100%", padding: "14px", display: "flex", gap: 18 }}>
      {/* Left counts */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 10, minWidth: 72 }}>
        {([["24","Users"],["31","Roles"],["47","Policies"]] as const).map(([n, l], i) => (
          <div key={l} style={{ animation: `ob-fade-up 0.35s ease ${i * 0.1 + 0.1}s both` }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 20, fontWeight: 700, color: "#e2e8f0", lineHeight: 1 }}>{n}</div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "rgba(100,116,139,0.5)", letterSpacing: "0.07em", marginTop: 1 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ width: 1, background: "rgba(255,255,255,0.06)", alignSelf: "stretch", margin: "4px 0" }} />
      {/* Right severity bars */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
        {bars.map(({ label, pct, color, count }, i) => (
          <div key={label} style={{ animation: `ob-fade-up 0.35s ease ${i * 0.09 + 0.2}s both` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "rgba(100,116,139,0.55)", letterSpacing: "0.07em" }}>{label}</span>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, fontWeight: 600, color }}>{count}</span>
            </div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 2, background: color, width: `${pct}%`, animation: `ob-bar-grow 0.65s ease ${i * 0.1 + 0.4}s both` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfraPreview() {
  const svcs = [
    { label: "EC2 & Compute", Icon: Server,  findings: 10, crit: 4, color: "#ff0040" },
    { label: "S3 & Storage",  Icon: Archive, findings: 10, crit: 2, color: "#ff6b35" },
    { label: "VPC & Network", Icon: Network, findings: 7,  crit: 1, color: "#ffb000" },
    { label: "DynamoDB",      Icon: Database,findings: 4,  crit: 0, color: "#00ff88" },
  ];
  return (
    <div style={{ width: "100%", height: "100%", padding: "12px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
      {svcs.map(({ label, Icon, findings, crit, color }, i) => (
        <div key={label} style={{ padding: "8px 10px", borderRadius: 6, background: "rgba(15,23,42,0.7)", border: "1px solid rgba(255,255,255,0.06)", animation: `ob-scale-in 0.3s ease ${i * 0.08 + 0.1}s both` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
            <Icon size={10} color="rgba(100,116,139,0.6)" />
            <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: 9.5, color: "rgba(148,163,184,0.75)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 19, fontWeight: 700, color: "#e2e8f0", lineHeight: 1 }}>{findings}</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color, marginTop: 2 }}>{crit} critical</div>
        </div>
      ))}
    </div>
  );
}

function ThreatPreview() {
  const threats = [
    { svc: "SecurityHub", msg: "20 findings — compliance score 68",  sev: "HIGH",     color: "#ff6b35" },
    { svc: "GuardDuty",   msg: "Recon:EC2/PortScan detected",        sev: "CRITICAL", color: "#ff0040" },
    { svc: "Inspector",   msg: "CVE-2024-1234 exploitable path",     sev: "HIGH",     color: "#ff6b35" },
    { svc: "Macie",       msg: "PII in 2 public S3 objects",         sev: "MEDIUM",   color: "#ffb000" },
  ];
  return (
    <div style={{ width: "100%", height: "100%", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 5 }}>
      {threats.map(({ svc, msg, sev, color }, i) => (
        <div key={svc} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 9px", borderRadius: 5, background: "rgba(15,23,42,0.6)", border: `1px solid ${color}1a`, animation: `ob-slide-in 0.35s ease ${i * 0.1 + 0.1}s both` }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0, animation: "ob-pulse 2s ease-in-out infinite" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "rgba(100,116,139,0.6)", marginBottom: 1 }}>{svc}</div>
            <div style={{ fontFamily: "DM Sans, sans-serif", fontSize: 10, color: "rgba(148,163,184,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg}</div>
          </div>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color, letterSpacing: "0.06em", flexShrink: 0 }}>{sev}</span>
        </div>
      ))}
    </div>
  );
}

function SOCPreview() {
  const alerts = [
    { id: "ALT-001", title: "Root account login detected",       status: "TRIAGE",        color: "#ff0040" },
    { id: "ALT-002", title: "Unusual API call volume — us-east", status: "INVESTIGATING", color: "#ff6b35" },
    { id: "ALT-003", title: "Cross-region replication started",  status: "NEW",           color: "#ffb000" },
  ];
  const spark = [4, 6, 3, 8, 5, 9, 6, 11, 8, 14, 10, 7];
  return (
    <div style={{ width: "100%", height: "100%", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "rgba(100,116,139,0.45)", letterSpacing: "0.1em", marginBottom: 1, animation: "ob-fade-up 0.3s ease both" }}>ALERT QUEUE · 3 ACTIVE</div>
      {alerts.map(({ id, title, status, color }, i) => (
        <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 9px", borderRadius: 5, background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.05)", animation: `ob-fade-up 0.35s ease ${i * 0.12 + 0.1}s both` }}>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "rgba(100,116,139,0.45)", flexShrink: 0 }}>{id}</span>
          <span style={{ flex: 1, fontFamily: "DM Sans, sans-serif", fontSize: 10.5, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 7.5, color, padding: "2px 5px", borderRadius: 3, background: `${color}14`, flexShrink: 0, letterSpacing: "0.05em" }}>{status}</span>
        </div>
      ))}
      {/* Sparkline */}
      <div style={{ marginTop: 2, display: "flex", alignItems: "flex-end", gap: 2, height: 20, animation: "ob-fade-up 0.4s ease 0.5s both" }}>
        {spark.map((h, i) => (
          <div key={i} style={{ flex: 1, borderRadius: 1, background: i >= 9 ? "#00ff88" : "rgba(0,255,136,0.18)", height: `${(h / 14) * 100}%` }} />
        ))}
      </div>
    </div>
  );
}

function GRCPreview() {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const score = 71;
  const offset = circ * (1 - score / 100);
  const fws = ["SOC 2", "PCI-DSS", "HIPAA", "CIS v8", "NIST CSF"];
  return (
    <div style={{ width: "100%", height: "100%", padding: "14px", display: "flex", alignItems: "center", gap: 20 }}>
      {/* Ring gauge */}
      <div style={{ position: "relative", flexShrink: 0, animation: "ob-scale-in 0.4s ease 0.1s both" }}>
        <svg width="92" height="92" viewBox="0 0 92 92">
          <circle cx="46" cy="46" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
          <circle cx="46" cy="46" r={r} fill="none" stroke="#00ff88" strokeWidth="7"
            strokeLinecap="round" strokeDasharray={circ}
            style={{ strokeDashoffset: offset, animation: `ob-ring 1s ease 0.3s both`, ["--ring-offset" as string]: offset }}
            transform="rotate(-90 46 46)"
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 18, fontWeight: 700, color: "#00ff88", lineHeight: 1 }}>{score}</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 7.5, color: "rgba(100,116,139,0.5)", letterSpacing: "0.08em", marginTop: 2 }}>SCORE</div>
        </div>
      </div>
      {/* Frameworks */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5, animation: "ob-fade-up 0.4s ease 0.3s both" }}>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "rgba(100,116,139,0.45)", letterSpacing: "0.1em", marginBottom: 3 }}>FRAMEWORKS</div>
        {fws.map((f, i) => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: 7, animation: `ob-slide-in 0.3s ease ${i * 0.07 + 0.4}s both` }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: i < 3 ? "#00ff88" : "rgba(0,255,136,0.3)" }} />
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "rgba(148,163,184,0.8)" }}>{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsPreview() {
  const rpts = [
    { name: "IAM Full Scan",     date: "2025-04-13", count: 10, tag: "COMPLETE" },
    { name: "Security Posture",  date: "2025-04-12", count: 89, tag: "COMPLETE" },
    { name: "Compliance Audit",  date: "2025-04-10", count: 34, tag: "ARCHIVED" },
  ];
  return (
    <div style={{ width: "100%", height: "100%", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 5 }}>
      {rpts.map(({ name, date, count, tag }, i) => (
        <div key={name} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 10px", borderRadius: 5, background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.05)", animation: `ob-fade-up 0.35s ease ${i * 0.1 + 0.1}s both` }}>
          <FileText size={12} color="rgba(100,116,139,0.45)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "DM Sans, sans-serif", fontSize: 11, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, color: "rgba(100,116,139,0.5)", marginTop: 1 }}>{date} · {count} findings</div>
          </div>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 7.5, color: "#00ff88", padding: "2px 5px", borderRadius: 3, background: "rgba(0,255,136,0.08)", flexShrink: 0 }}>{tag}</span>
        </div>
      ))}
      {/* Connection status */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 10px", borderRadius: 5, background: "rgba(0,255,136,0.04)", border: "1px dashed rgba(0,255,136,0.18)", animation: "ob-fade-up 0.35s ease 0.4s both" }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff88", animation: "ob-pulse 1.5s ease-in-out infinite", flexShrink: 0 }} />
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8.5, color: "rgba(0,255,136,0.65)" }}>123456789012 · us-east-1 · LIVE</span>
      </div>
    </div>
  );
}

// ─── STEP DEFINITIONS ────────────────────────────────────────────────────────

type StepDef = {
  id: string;
  num: string;
  navLabel: string;
  title: string;
  description: string;
  icon: typeof Shield;
  color: string;
  features: string[];
  tab?: string;
  tabLabel?: string;
  tab2?: string;
  tabLabel2?: string;
  Preview: () => JSX.Element;
};

const STEPS: StepDef[] = [
  {
    id: "welcome",
    num: "01",
    navLabel: "Welcome",
    title: "Welcome to IAM Argus",
    description: "Your enterprise-grade cloud security command center. This 8-step tour shows every major capability so you're effective from day one.",
    icon: Shield,
    color: "#00ff88",
    features: [
      "89 findings aggregated across IAM, compute, storage, and managed services — all in one view.",
      "Sovereign dark interface built for security engineers: JetBrains Mono data, DM Sans copy, electric-green signals.",
      "Mock mode is active. Every feature is populated with realistic data — no AWS account required to explore.",
    ],
    Preview: WelcomePreview,
  },
  {
    id: "dashboard",
    num: "02",
    navLabel: "Security Overview",
    title: "Security Command Center",
    description: "The main dashboard surfaces your entire security posture: live KPIs, scan controls, IR mode, and a triage queue for immediate remediation.",
    icon: LayoutDashboard,
    color: "#00b4ff",
    tab: "dashboard",
    tabLabel: "Open Security Overview",
    features: [
      "Full Security Scan button triggers all scanners in sequence — progress shows inline.",
      "IR Mode reframes the dashboard for incident responders: triage queue replaces summary tiles.",
      "Click any KPI tile (Critical, High, Open Findings) to jump to the relevant detail surface.",
      "Scan Delta banner appears after each scan to highlight new and resolved findings.",
    ],
    Preview: DashboardPreview,
  },
  {
    id: "iam",
    num: "03",
    navLabel: "IAM & Identity",
    title: "Identity & Access Management",
    description: "Scan every IAM user, role, and policy for over-privilege, stale credentials, public exposure, and missing MFA — with actionable severity breakdown.",
    icon: Users,
    color: "#a78bfa",
    tab: "iam-security",
    tabLabel: "Open IAM Scanner",
    tab2: "access-analyzer",
    tabLabel2: "Access Analyzer",
    features: [
      "24 users · 31 roles · 47 policies — scanned for least-privilege violations and public access.",
      "Access Analyzer flags cross-account trust policies and externally accessible resources.",
      "Findings table is filterable by severity, resource type, and assignee for team triage.",
    ],
    Preview: IAMPreview,
  },
  {
    id: "infra",
    num: "04",
    navLabel: "Infrastructure",
    title: "Infrastructure Security",
    description: "Four dedicated scanners cover your compute, storage, network, and database layers — each with findings mapped to exploitability and blast radius.",
    icon: Layers,
    color: "#fb923c",
    tab: "ec2-security",
    tabLabel: "EC2 & Compute",
    tab2: "s3-security",
    tabLabel2: "S3 & Storage",
    features: [
      "EC2: 4 critical findings including instances with unrestricted security groups and public IPs.",
      "S3: 3 public buckets detected with object ACL and bucket policy misconfigurations.",
      "VPC & DynamoDB scanners cover flow log gaps, unencrypted tables, and open NACLs.",
    ],
    Preview: InfraPreview,
  },
  {
    id: "threats",
    num: "05",
    navLabel: "Threat Intel",
    title: "Managed Threat Services",
    description: "Five AWS managed services feed findings into IAM Argus in real time: GuardDuty, Macie, Inspector, SecurityHub, and Config.",
    icon: Eye,
    color: "#f43f5e",
    tab: "guardduty",
    tabLabel: "Open GuardDuty",
    tab2: "security-hub",
    tabLabel2: "Security Hub",
    features: [
      "GuardDuty surfaces behavioral anomalies — port scans, credential exfil, DNS tunneling.",
      "Inspector maps CVEs to exploitable paths in your running EC2 and Lambda workloads.",
      "Macie classifies sensitive data in S3 buckets and flags policy violations automatically.",
      "Security Hub aggregates findings across all services into a unified compliance score.",
    ],
    Preview: ThreatPreview,
  },
  {
    id: "soc",
    num: "06",
    navLabel: "Security Ops",
    title: "Security Operations Center",
    description: "The SOC module is your analyst workspace: alert queue, investigation workspace, log pipeline, query workbench, and monitoring coverage.",
    icon: Activity,
    color: "#22d3ee",
    tab: "soc",
    tabLabel: "Open SOC Center",
    tab2: "alerts",
    tabLabel2: "Security Alerts",
    features: [
      "Alert Queue shows all active alerts with severity, assignee, and workflow status in one table.",
      "Investigation Workspace lets analysts attach evidence, write timelines, and close cases.",
      "Log Pipeline visualises data ingestion health and latency across CloudTrail, VPC Flow, and GuardDuty.",
      "Query Workbench provides a Logs Insights-style interface for ad-hoc threat hunting.",
    ],
    Preview: SOCPreview,
  },
  {
    id: "grc",
    num: "07",
    navLabel: "GRC & Compliance",
    title: "Governance, Risk & Compliance",
    description: "Track compliance posture across SOC 2, PCI-DSS, HIPAA, CIS, and NIST. Generate evidence packages and map findings to control failures.",
    icon: BookOpen,
    color: "#34d399",
    tab: "grc",
    tabLabel: "Open GRC Center",
    tab2: "infra-security",
    tabLabel2: "Infra Security",
    features: [
      "Compliance score of 71 with per-framework breakdown and control-level failure reasons.",
      "Evidence panel auto-collects scan outputs, config snapshots, and remediation logs.",
      "Architecture & Cost Risk view highlights misconfigurations with direct cost impact.",
    ],
    Preview: GRCPreview,
  },
  {
    id: "reports",
    num: "08",
    navLabel: "Reports & Settings",
    title: "Reports & Configuration",
    description: "Generate audit-ready PDF reports from any scan, visualize trends in Grafana, and configure your AWS account connection and scan schedules.",
    icon: Settings,
    color: "#94a3b8",
    tab: "reports",
    tabLabel: "View Reports",
    tab2: "settings",
    tabLabel2: "Open Settings",
    features: [
      "Reports are auto-generated after every full scan — export as PDF for auditors and leadership.",
      "Grafana integration surfaces custom dashboards built on your IAM Argus findings data.",
      "Settings → AWS Account: set region, profile, or IAM role — then Test Connection before saving.",
    ],
    Preview: ReportsPreview,
  },
];

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export type OnboardingWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (tab: string) => void;
  /** Called when the user clicks "Start Guided Tour" on the final step */
  onStartTour?: () => void;
};

export function OnboardingWizard({ open, onOpenChange, onNavigate, onStartTour }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const goTo = (tab: string) => {
    if (onNavigate) onNavigate(tab);
    onOpenChange(false);
  };

  if (!open) return null;

  const cur = STEPS[step];
  const isFirst = step === 0;
  const isLast  = step === STEPS.length - 1;
  const CurIcon = cur.icon;

  return (
    <>
      <style>{CSS}</style>

      {/* Backdrop */}
      <div
        onClick={() => onOpenChange(false)}
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(0,3,10,0.88)",
          backdropFilter: "blur(5px)",
        }}
      />

      {/* Modal shell */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none", padding: "16px",
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="IAM Argus Onboarding Tour"
          style={{
            width: "min(100%, 960px)",
            height: "min(100%, 620px)",
            // palette: popover/overlay (#0f1729)
            background: "#0f1729",
            border: "1px solid rgba(0,255,136,0.14)",
            // dialogs are the accepted exception above 10px — 12px max for modals
            borderRadius: 12,
            // ring shadow only — removed decorative drop shadow
            boxShadow: "0 0 0 1px rgba(0,0,0,0.6), 0 0 60px rgba(0,255,136,0.04)",
            pointerEvents: "all",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "ob-scale-in 0.22s ease both",
          }}
        >

          {/* ── Top bar ──────────────────────────────────────────── */}
          <div style={{
            display: "flex", alignItems: "center",
            padding: "13px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.055)",
            background: "rgba(0,0,0,0.35)",
            flexShrink: 0, gap: 16,
          }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <div style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.28)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Shield size={13} color="#00ff88" />
              </div>
              <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 700, color: "#e2e8f0", letterSpacing: "0.12em" }}>IAM Argus</span>
              {/* fixed: was 8.5px — section label min is 10px */}
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "rgba(0,255,136,0.45)", letterSpacing: "0.1em" }}>TOUR</span>
            </div>

            {/* Progress bar */}
            <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,0.07)", borderRadius: 1, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "linear-gradient(90deg, rgba(0,255,136,0.5), #00ff88)", width: `${((step + 1) / STEPS.length) * 100}%`, transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)", borderRadius: 1 }} />
            </div>

            {/* Counter + close */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "rgba(100,116,139,0.55)" }}>
                {String(step + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
              </span>
              <button
                onClick={() => onOpenChange(false)}
                aria-label="Close onboarding tour"
                style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(100,116,139,0.65)", transition: "all 0.15s ease" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.09)"; (e.currentTarget as HTMLButtonElement).style.color = "#e2e8f0"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(100,116,139,0.65)"; }}
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* ── Body ─────────────────────────────────────────────── */}
          <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

            {/* Left nav */}
            <nav
              aria-label="Tour steps"
              style={{ width: 210, borderRight: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.22)", padding: "10px 0", overflowY: "auto", flexShrink: 0 }}
            >
              {STEPS.map((s, i) => {
                const SIcon = s.icon;
                const isActive = i === step;
                const isDone   = i < step;
                return (
                  <button
                    key={s.id}
                    onClick={() => setStep(i)}
                    aria-current={isActive ? "step" : undefined}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 9,
                      padding: "8px 14px 8px 13px",
                      background: isActive ? "rgba(0,255,136,0.055)" : "transparent",
                      border: "none",
                      borderLeft: `3px solid ${isActive ? "#00ff88" : "transparent"}`,
                      cursor: "pointer", textAlign: "left",
                      transition: "background 0.15s, border-color 0.15s",
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)"; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: isActive ? `${s.color}18` : isDone ? "rgba(0,255,136,0.06)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${isActive ? `${s.color}40` : isDone ? "rgba(0,255,136,0.2)" : "rgba(255,255,255,0.08)"}`,
                      transition: "background 0.15s, border-color 0.15s",
                    }}>
                      {isDone
                        ? <CheckCircle2 size={11} color="rgba(0,255,136,0.55)" />
                        : <SIcon size={11} color={isActive ? s.color : "rgba(100,116,139,0.45)"} />
                      }
                    </div>
                    <div style={{ minWidth: 0 }}>
                      {/* fixed: was 7.5px — section label min is 10px */}
                      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: isActive ? `${s.color}70` : "rgba(100,116,139,0.35)", letterSpacing: "0.08em", marginBottom: 1 }}>{s.num}</div>
                      {/* fixed: was 11px — small body is 12px */}
                      <div style={{ fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? "#e2e8f0" : isDone ? "rgba(148,163,184,0.55)" : "rgba(100,116,139,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.navLabel}</div>
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Right content */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
              <div
                key={`content-${step}`}
                style={{ flex: 1, overflowY: "auto", padding: "22px 26px" }}
              >
                {/* Step header */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18, animation: "ob-fade-up 0.28s ease both" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: `${cur.color}10`, border: `1px solid ${cur.color}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                    <CurIcon size={19} color={cur.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: `${cur.color}70`, letterSpacing: "0.12em", marginBottom: 4 }}>STEP {cur.num}</div>
                    <h2 style={{ fontFamily: "DM Sans, sans-serif", fontSize: 20, fontWeight: 700, color: "#f1f5f9", margin: 0, lineHeight: 1.2, letterSpacing: "-0.025em" }}>{cur.title}</h2>
                    <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: 13, color: "rgba(100,116,139,0.8)", margin: "6px 0 0", lineHeight: 1.65, maxWidth: 540 }}>{cur.description}</p>
                  </div>
                </div>

                {/* Animated preview */}
                <div
                  key={`preview-${step}`}
                  style={{ height: 158, borderRadius: 9, overflow: "hidden", background: "rgba(0,5,16,0.85)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 18, position: "relative" }}
                >
                  {/* Dot grid */}
                  <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(0,255,136,0.07) 1px, transparent 1px)", backgroundSize: "20px 20px", pointerEvents: "none" }} />
                  {/* Corner label */}
                  <span style={{ position: "absolute", top: 8, right: 10, fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "rgba(0,255,136,0.25)", letterSpacing: "0.12em", pointerEvents: "none", zIndex: 1 }}>PREVIEW</span>
                  <div style={{ position: "absolute", inset: 0 }}>
                    <cur.Preview />
                  </div>
                </div>

                {/* Feature bullets */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {cur.features.map((f, i) => (
                    <div key={i} className="ob-fi" style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ width: 17, height: 17, borderRadius: 4, background: `${cur.color}0e`, border: `1px solid ${cur.color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                        <ChevronRight size={9} color={cur.color} />
                      </div>
                      <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: 13, color: "rgba(148,163,184,0.85)", lineHeight: 1.6 }}>{f}</span>
                    </div>
                  ))}
                </div>

                {/* CTA nav buttons */}
                {(cur.tab ?? cur.tab2) && (
                  <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
                    {cur.tab && (
                      <button
                        onClick={() => goTo(cur.tab!)}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 15px", borderRadius: 6, background: `${cur.color}12`, border: `1px solid ${cur.color}2e`, cursor: "pointer", fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 600, color: cur.color, transition: "all 0.18s ease" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${cur.color}20`; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${cur.color}12`; }}
                      >
                        <Zap size={11} />
                        {cur.tabLabel}
                      </button>
                    )}
                    {cur.tab2 && (
                      <button
                        onClick={() => goTo(cur.tab2!)}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 15px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "rgba(148,163,184,0.75)", transition: "all 0.18s ease" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLButtonElement).style.color = "#e2e8f0"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(148,163,184,0.75)"; }}
                      >
                        {cur.tabLabel2}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ── Bottom nav bar ───────────────────────────────── */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "11px 20px",
                borderTop: "1px solid rgba(255,255,255,0.055)",
                background: "rgba(0,0,0,0.22)",
                flexShrink: 0, gap: 12,
              }}>
                {/* Skip */}
                <button
                  onClick={() => onOpenChange(false)}
                  style={{ fontFamily: "DM Sans, sans-serif", fontSize: 11.5, color: "rgba(100,116,139,0.55)", background: "none", border: "none", cursor: "pointer", padding: "5px 6px", transition: "color 0.15s ease" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(148,163,184,0.75)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(100,116,139,0.55)"; }}
                >
                  Skip tour
                </button>

                {/* Step dots */}
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  {STEPS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setStep(i)}
                      aria-label={`Go to step ${i + 1}`}
                      style={{ width: i === step ? 18 : 6, height: 6, borderRadius: 3, padding: 0, border: "none", cursor: "pointer", background: i === step ? "#00ff88" : i < step ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.1)", transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)" }}
                    />
                  ))}
                </div>

                {/* Back / Next */}
                <div style={{ display: "flex", gap: 8 }}>
                  {!isFirst && (
                    <button
                      onClick={() => setStep(s => s - 1)}
                      style={{ padding: "7px 16px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "rgba(148,163,184,0.8)", transition: "all 0.15s ease" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
                    >
                      Back
                    </button>
                  )}
                  {isLast ? (
                    <>
                      {onStartTour && (
                        <button
                          onClick={() => { onOpenChange(false); onStartTour(); }}
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 16px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 500, color: "rgba(148,163,184,0.85)", transition: "all 0.15s ease" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "#e2e8f0"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(148,163,184,0.85)"; }}
                        >
                          Start guided tour
                          <ChevronRight size={12} />
                        </button>
                      )}
                      <button
                        onClick={() => onOpenChange(false)}
                        style={{ padding: "7px 22px", borderRadius: 6, background: "rgba(0,255,136,0.14)", border: "1px solid rgba(0,255,136,0.32)", cursor: "pointer", fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 600, color: "#00ff88", transition: "all 0.15s ease" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,255,136,0.22)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,255,136,0.14)"; }}
                      >
                        Get started
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setStep(s => s + 1)}
                      style={{ padding: "7px 20px", borderRadius: 6, background: "rgba(0,255,136,0.14)", border: "1px solid rgba(0,255,136,0.32)", cursor: "pointer", fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 600, color: "#00ff88", display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s ease" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,255,136,0.22)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,255,136,0.14)"; }}
                    >
                      Next <ChevronRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
