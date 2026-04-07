import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  Search, Bell, Settings, User, LogOut,
  ChevronDown, MapPin,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useActiveScanResults } from "../hooks/useActiveScanResults";
import { cn } from "./ui/utils";

interface HeaderProps {
  onNavigate?: (tab: string) => void;
  activeTab?: string;
}

const TAB_LABELS: Record<string, string> = {
  dashboard: "Security Overview",
  "iam-security": "IAM & Access Control",
  "access-analyzer": "Access Analyzer",
  "ec2-security": "EC2 & Compute",
  "s3-security": "S3 & Storage",
  "vpc-security": "VPC & Network",
  "dynamodb-security": "DynamoDB Security",
  "security-hub": "Security Hub",
  guardduty: "GuardDuty",
  config: "AWS Config",
  inspector: "Inspector",
  macie: "Macie",
  alerts: "Security Alerts",
  compliance: "Compliance",
  reports: "Reports",
  grafana: "Grafana Integration",
  settings: "Settings",
};

const mockNotifications = [
  {
    id: 1,
    type: "Critical",
    title: "S3 Bucket Publicly Accessible",
    description: "Bucket 'company-backups' has public read access",
    timestamp: "2 min ago",
    read: false,
  },
  {
    id: 2,
    type: "Warning",
    title: "EC2 Security Group Misconfigured",
    description: "Security group allows SSH from 0.0.0.0/0",
    timestamp: "15 min ago",
    read: false,
  },
  {
    id: 3,
    type: "Info",
    title: "IAM Compliance Scan Completed",
    description: "Daily AWS security scan finished successfully",
    timestamp: "1 hour ago",
    read: true,
  },
];

function ShieldMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14 3L24.5 8V15.5C24.5 21 20 25.2 14 27C8 25.2 3.5 21 3.5 15.5V8L14 3Z"
        fill="rgba(0,255,136,0.1)"
        stroke="rgba(0,255,136,0.65)"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 14.5L13.5 17.5L19 11.5"
        stroke="#00ff88"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Header({ onNavigate, activeTab = "dashboard" }: HeaderProps) {
  const auth = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const { getAllScanResults, scanResultsVersion } = useActiveScanResults();
  const displayName = auth.user?.username || "Authenticated User";
  const initials = displayName
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AU";

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      window.location.assign("/login");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to clear session.";
      toast.error(message);
    }
  };

  const tabSearchItems = useMemo(() => [
    { id: "dashboard", label: "Security Overview", category: "Tab", tab: "dashboard", keywords: ["overview", "dashboard", "home"] },
    { id: "iam-security", label: "IAM & Access Control", category: "Tab", tab: "iam-security", keywords: ["iam", "access", "identity", "users"] },
    { id: "access-analyzer", label: "Access Analyzer", category: "Tab", tab: "access-analyzer", keywords: ["access analyzer", "cross-account"] },
    { id: "ec2-security", label: "EC2 & Compute", category: "Tab", tab: "ec2-security", keywords: ["ec2", "compute"] },
    { id: "s3-security", label: "S3 & Storage", category: "Tab", tab: "s3-security", keywords: ["s3", "storage", "bucket"] },
    { id: "vpc-security", label: "VPC & Network", category: "Tab", tab: "vpc-security", keywords: ["vpc", "network"] },
    { id: "dynamodb-security", label: "DynamoDB", category: "Tab", tab: "dynamodb-security", keywords: ["dynamodb", "database"] },
    { id: "security-hub", label: "Security Hub", category: "Tab", tab: "security-hub", keywords: ["security hub"] },
    { id: "guardduty", label: "GuardDuty", category: "Tab", tab: "guardduty", keywords: ["guardduty"] },
    { id: "config", label: "Config", category: "Tab", tab: "config", keywords: ["config"] },
    { id: "inspector", label: "Inspector", category: "Tab", tab: "inspector", keywords: ["inspector"] },
    { id: "macie", label: "Macie", category: "Tab", tab: "macie", keywords: ["macie"] },
    { id: "alerts", label: "Security Alerts", category: "Tab", tab: "alerts", keywords: ["alerts", "findings"] },
    { id: "compliance", label: "Compliance Dashboard", category: "Tab", tab: "compliance", keywords: ["compliance", "framework"] },
    { id: "reports", label: "Security Reports", category: "Tab", tab: "reports", keywords: ["reports"] },
    { id: "grafana", label: "Grafana Integration", category: "Tab", tab: "grafana", keywords: ["grafana", "charts"] },
    { id: "settings", label: "Settings", category: "Tab", tab: "settings", keywords: ["settings", "configuration"] },
  ], []);

  const scanResults = useMemo(() => getAllScanResults(), [scanResultsVersion, getAllScanResults]);

  const findingSearchItems = useMemo(() => {
    const scannerTabMap: Record<string, string> = {
      iam: "iam-security",
      "security-hub": "security-hub",
      guardduty: "guardduty",
      config: "config",
      inspector: "inspector",
      macie: "macie",
      ec2: "ec2-security",
      s3: "s3-security",
      vpc: "vpc-security",
      dynamodb: "dynamodb-security",
      full: "alerts",
    };
    return scanResults
      .flatMap((scan) =>
        (scan.findings ?? []).map((finding: any, index: number) => {
          const id = finding.id || `${scan.scanner_type}-${scan.scan_id}-${index}`;
          const resource = finding.resource_name || finding.resource_id || finding.resource_arn || "Unknown resource";
          const title = finding.finding_type || finding.title || "Security finding";
          const severity = (finding.severity || "Medium").toString();
          const targetTab = scannerTabMap[scan.scanner_type] || "alerts";
          return {
            id: `${scan.scan_id}-${scan.scanner_type}-${id}-${index}`,
            findingId: id,
            label: `${title} (${resource})`,
            category: "Finding",
            tab: targetTab,
            keywords: [id, resource, title, finding.description || "", finding.resource_arn || "", severity],
            badge: severity,
          };
        })
      )
      .slice(0, 100);
  }, [scanResults]);

  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];
    const allItems = [...tabSearchItems, ...findingSearchItems];
    return allItems
      .filter((item) => {
        const haystack = `${item.label} ${item.category} ${item.keywords.join(" ")}`.toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 8);
  }, [searchTerm, tabSearchItems, findingSearchItems]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        const input = searchContainerRef.current?.querySelector("input");
        input?.focus();
        setSearchDropdownOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navigateFromSearch = (tab: string) => {
    onNavigate?.(tab);
    setSearchTerm("");
    setSearchDropdownOpen(false);
  };

  const unreadCount = mockNotifications.filter((n) => !n.read).length;
  const currentPageLabel = TAB_LABELS[activeTab] ?? "Security Overview";

  const getSeverityStyle = (badge: string): CSSProperties => {
    const s = badge.toLowerCase();
    if (s === "critical") return { color: "#ff0040", background: "rgba(255,0,64,0.1)", border: "1px solid rgba(255,0,64,0.2)" };
    if (s === "high") return { color: "#ff6b35", background: "rgba(255,107,53,0.1)", border: "1px solid rgba(255,107,53,0.2)" };
    if (s === "medium") return { color: "#ffb000", background: "rgba(255,176,0,0.1)", border: "1px solid rgba(255,176,0,0.2)" };
    return { color: "#94a3b8", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" };
  };

  const notifColors: Record<string, string> = {
    Critical: "#ff0040",
    Warning: "#ffb000",
    Info: "#0ea5e9",
  };

  return (
    <header
      className="relative h-16 flex items-center justify-between px-5 z-30 shrink-0"
      style={{
        background: "linear-gradient(180deg, rgba(7,11,22,0.99) 0%, rgba(9,14,27,0.98) 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: "linear-gradient(to right, transparent 0%, rgba(0,255,136,0.5) 25%, rgba(0,255,136,0.5) 75%, transparent 100%)",
        }}
      />

      {/* ── LEFT: Brand + Breadcrumb ── */}
      <div className="flex items-center gap-3.5 shrink-0">
        <div className="flex items-center gap-2.5">
          <ShieldMark />
          <div className="hidden sm:flex flex-col leading-none gap-1">
            <span
              className="text-[11px] font-bold tracking-[0.22em] text-white"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              IAM
            </span>
            <span
              className="text-[9px] tracking-[0.14em] uppercase"
              style={{ color: "rgba(0,255,136,0.55)", fontFamily: "'JetBrains Mono', monospace" }}
            >
              AWS Platform
            </span>
          </div>
        </div>

        <div className="hidden md:block w-px h-7" style={{ background: "rgba(255,255,255,0.08)" }} />

        <div className="hidden md:flex items-center gap-2">
          <span className="text-sm" style={{ color: "rgba(71,85,105,0.7)" }}>/</span>
          <span className="text-sm font-medium text-slate-300 max-w-[200px] truncate">
            {currentPageLabel}
          </span>
        </div>
      </div>

      {/* ── CENTER: Search ── */}
      <div className="flex items-center gap-3 flex-1 justify-center">
        <div ref={searchContainerRef} className="relative flex-1 max-w-[460px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none"
            style={{ color: "rgba(71,85,105,0.8)" }}
          />
          <Input
            placeholder="Search tabs, findings, resources…"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSearchDropdownOpen(true);
            }}
            onFocus={() => setSearchDropdownOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchResults.length > 0) navigateFromSearch(searchResults[0].tab);
              if (e.key === "Escape") setSearchDropdownOpen(false);
            }}
            className="h-9 pl-9 pr-14 text-sm rounded-lg border-0"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#cbd5e1",
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
          <kbd
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none select-none"
            style={{
              fontSize: "10px",
              color: "rgba(71,85,105,0.7)",
              fontFamily: "'JetBrains Mono', monospace",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "4px",
              padding: "4px 4px",
            }}
        >
          ⌘K
        </kbd>

        {/* Search Dropdown */}
        {searchDropdownOpen && searchTerm.trim() && (
          <div
            className="absolute top-full mt-2 left-0 right-0 rounded-[10px] overflow-hidden z-50"
            style={{
              background: "rgba(15,23,41,0.99)",
              border: "1px solid rgba(255,255,255,0.09)",
              boxShadow: "0 0 0 1px rgba(0,255,136,0.04)",
            }}
          >
            {searchResults.length > 0 ? (
              searchResults.map((item, i) => (
                <div
                  key={`${item.category}-${item.id}`}
                  role="button"
                  className="flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer"
                  style={{
                    borderBottom: i < searchResults.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    transition: "background 0.1s",
                  }}
                  onMouseDown={(e) => { e.preventDefault(); navigateFromSearch(item.tab); }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="text-[9px] font-semibold uppercase tracking-widest shrink-0 w-12"
                      style={{ color: "rgba(71,85,105,0.7)", fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {item.category}
                    </span>
                    <span className="text-sm text-slate-300 truncate">{item.label}</span>
                  </div>
                  {"badge" in item && item.badge && (
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
                      style={getSeverityStyle(item.badge)}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="px-4 py-5 text-sm text-center" style={{ color: "rgba(71,85,105,0.8)" }}>
                No results for "{searchTerm}"
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Controls ── */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Region pill */}
        <button
          className="hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-all"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(148,163,184,0.75)",
            fontFamily: "'JetBrains Mono', monospace",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.03)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
          }}
        >
          <MapPin className="h-3 w-3" />
          us-east-1
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>

        {/* Live badge */}
        <div
          className="hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold tracking-widest ml-1"
          style={{
            background: "rgba(0,255,136,0.06)",
            border: "1px solid rgba(0,255,136,0.18)",
            color: "#00ff88",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00ff88]" style={{ boxShadow: "0 0 0 1px rgba(0,255,136,0.3)" }} />
          </span>
          LIVE
        </div>

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 rounded-lg ml-1"
              style={{ color: "rgba(100,116,139,0.9)" }}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span
                  className="absolute top-[7px] right-[7px] h-[7px] w-[7px] rounded-full"
                  style={{ background: "#ff0040", boxShadow: "0 0 0 2px rgba(7,11,22,1)" }}
                />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="p-0 w-80 rounded-[10px]"
            align="end"
            style={{
              background: "rgba(15,23,41,0.99)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-slate-200">Alerts</span>
                {unreadCount > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#ff0040", background: "rgba(255,0,64,0.1)", border: "1px solid rgba(255,0,64,0.22)", padding: "0 8px", borderRadius: 999, fontFamily: "'JetBrains Mono', monospace" }}>
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  style={{ fontSize: 11, color: "rgba(100,116,139,0.6)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#e2e8f0")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(100,116,139,0.6)")}
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-auto">
              {mockNotifications.map((n, i) => {
                const color = notifColors[n.type] || "#94a3b8";
                return (
                  <div
                    key={n.id}
                    className="px-4 py-2.5 cursor-pointer"
                    style={{
                      borderBottom: i < mockNotifications.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                      background: !n.read ? "rgba(255,255,255,0.015)" : "transparent",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = !n.read ? "rgba(255,255,255,0.015)" : "transparent")}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="shrink-0 rounded-full" style={{ width: 6, height: 6, background: color, marginTop: 4 }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2 mb-0.5">
                          <p className="text-xs font-medium text-slate-200 truncate">{n.title}</p>
                          <span style={{ fontSize: 10, color: "rgba(71,85,105,0.7)", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{n.timestamp}</span>
                        </div>
                        <p style={{ fontSize: 11, color: "rgba(100,116,139,0.65)", fontFamily: "'JetBrains Mono', monospace" }}>{n.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <button
                onClick={() => onNavigate?.("alerts")}
                className="w-full text-center transition-colors"
                style={{ fontSize: 12, color: "rgba(100,116,139,0.7)", background: "none", border: "none", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#e2e8f0")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(100,116,139,0.7)")}
              >
                View all alerts →
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-all"
              style={{ background: "transparent" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback
                  className="text-[11px] font-bold"
                  style={{ background: "rgba(0,255,136,0.1)", color: "#00ff88" }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden lg:block text-xs text-slate-400">{displayName}</span>
              <ChevronDown className="hidden lg:block h-3 w-3 text-slate-600" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className={cn("w-52 p-0 rounded-[10px]")}
            style={{
              background: "rgba(15,23,41,0.99)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="px-3 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-sm font-semibold text-slate-200">{displayName}</p>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#00ff88", background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.2)", padding: "0 8px", borderRadius: 999, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em" }}>
                  USER
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "rgba(100,116,139,0.8)" }}>{displayName}</p>
            </div>
            <div className="p-1.5">
              <DropdownMenuItem className="rounded-lg cursor-pointer text-slate-400 hover:text-slate-200 text-sm gap-2.5">
                <User className="h-4 w-4 text-slate-600" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-lg cursor-pointer text-slate-400 hover:text-slate-200 text-sm gap-2.5"
                onClick={() => onNavigate?.("settings")}
              >
                <Settings className="h-4 w-4 text-slate-600" />
                Settings
              </DropdownMenuItem>
            </div>
            <DropdownMenuSeparator style={{ background: "rgba(255,255,255,0.06)" }} />
            <div className="p-1.5">
              <DropdownMenuItem
                className="rounded-lg cursor-pointer text-sm gap-2.5"
                style={{ color: "#ff0040" }}
                onClick={() => void handleSignOut()}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
