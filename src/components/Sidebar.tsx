import { useState } from "react";
import type { ElementType } from "react";
import { cn } from "./ui/utils";
import { AwsAccountSwitcher } from "./AwsAccountSwitcher";
import {
  LayoutDashboard,
  Shield,
  Database,
  Archive,
  Network,
  Users,
  FileText,
  Settings,
  BarChart3,
  AlertTriangle,
  Eye,
  BadgeCheck,
  Server,
  ChevronLeft,
  ChevronRight,
  Lock,
  ShieldAlert,
  Layers,
  BookOpen,
  X,
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: ElementType;
}

interface NavGroup {
  label: string | null;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: null,
    items: [
      { id: "dashboard", label: "Security Overview", icon: LayoutDashboard },
    ],
  },
  {
    label: "Infrastructure",
    items: [
      { id: "iam-security", label: "IAM & Access Control", icon: Users },
      { id: "access-analyzer", label: "Access Analyzer", icon: BadgeCheck },
      { id: "ec2-security", label: "EC2 & Compute", icon: Server },
      { id: "s3-security", label: "S3 & Storage", icon: Archive },
      { id: "vpc-security", label: "VPC & Network", icon: Network },
      { id: "dynamodb-security", label: "DynamoDB", icon: Database },
    ],
  },
  {
    label: "Managed Services",
    items: [
      { id: "security-hub", label: "Security Hub", icon: Shield },
      { id: "guardduty", label: "GuardDuty", icon: AlertTriangle },
      { id: "config", label: "Config", icon: Settings },
      { id: "inspector", label: "Inspector", icon: Lock },
      { id: "macie", label: "Macie", icon: Eye },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "soc", label: "Security Ops", icon: ShieldAlert },
      { id: "infra-security", label: "Infra Security", icon: Layers },
      { id: "grc", label: "GRC", icon: BookOpen },
      { id: "alerts", label: "Security Alerts", icon: AlertTriangle },
      { id: "reports", label: "Reports", icon: FileText },
      { id: "grafana", label: "Grafana", icon: BarChart3 },
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar({
  activeTab,
  onTabChange,
  isMobile = false,
  isOpen = false,
  onClose,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const effectiveCollapsed = isMobile ? false : collapsed;

  return (
    <>
      <aside
        className={
          isMobile
            ? "relative flex min-h-0 flex-col h-full shrink-0 z-[65]"
            : "relative flex min-h-0 flex-col h-full shrink-0 z-20"
        }
        style={{
          width: effectiveCollapsed ? "56px" : isMobile ? "280px" : "224px",
          transition: isMobile
            ? "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
            : "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          background: "rgba(6,9,18,0.98)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          ...(isMobile
            ? {
                position: "fixed",
                top: 0,
                left: 0,
                paddingTop: "64px",
                height: "100dvh",
                transform: isOpen ? "translateX(0)" : "translateX(-100%)",
                pointerEvents: isOpen ? "auto" : "none",
              }
            : {}),
        }}
      >
        {/* Collapse toggle — desktop only */}
        {!isMobile ? (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="absolute -right-3 top-[22px] z-30 flex h-6 w-6 items-center justify-center rounded-full"
            style={{
              background: "rgba(8,12,24,1)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(100,116,139,0.7)",
              transition: "border-color 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(0,255,136,0.45)";
              e.currentTarget.style.color = "#00ff88";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              e.currentTarget.style.color = "rgba(100,116,139,0.7)";
            }}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </button>
        ) : null}

        {/* Account switcher — mobile: close (X) attached to top-right of drawer */}
        <div
          className={isMobile && isOpen ? "flex items-start gap-2" : undefined}
          style={{
            padding: effectiveCollapsed ? "8px 8px 6px" : "8px 10px 6px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div className={isMobile && isOpen ? "min-w-0 flex-1" : undefined}>
            <AwsAccountSwitcher collapsed={effectiveCollapsed} />
          </div>
          {isMobile && isOpen ? (
            <button
              type="button"
              onClick={() => onClose?.()}
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-slate-300 transition-colors hover:border-white/20 hover:bg-white/10"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>

        {/* Navigation */}
        <nav
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-3 scrollbar-none"
          style={{
            paddingLeft: effectiveCollapsed ? "8px" : "10px",
            paddingRight: effectiveCollapsed ? "8px" : "10px",
          }}
        >
          {navGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-0.5" : ""}>
              {group.label && !effectiveCollapsed && (
                <div className="px-2 pt-5 pb-1.5">
                  <span
                    className="text-[9.5px] font-semibold uppercase"
                    style={{
                      color: "rgba(100,116,139,0.65)",
                      letterSpacing: "0.15em",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {group.label}
                  </span>
                </div>
              )}

              {group.label && effectiveCollapsed && gi > 0 && (
                <div
                  className="my-2 mx-1 h-px"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                />
              )}

              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;

                return (
                  <div key={item.id} className="relative">
                    {isActive && (
                      <span
                        className="absolute left-0 top-[5px] bottom-[5px] rounded-r-full pointer-events-none"
                        style={{ width: "3px", background: "#00ff88" }}
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        onTabChange(item.id);
                        if (isMobile) onClose?.();
                      }}
                      title={effectiveCollapsed ? item.label : undefined}
                      className={cn(
                        "w-full flex items-center rounded-lg text-sm transition-all duration-150",
                        effectiveCollapsed ? "justify-center h-10 px-0" : "h-9 gap-3 pl-4 pr-3",
                      )}
                      style={{
                        color: isActive ? "#00ff88" : "rgba(100,116,139,0.8)",
                        background: isActive ? "rgba(0,255,136,0.07)" : "transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                          e.currentTarget.style.color = "#cbd5e1";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "rgba(100,116,139,0.8)";
                        }
                      }}
                    >
                      <Icon
                        className="shrink-0"
                        style={{
                          width: "15px",
                          height: "15px",
                          color: isActive ? "#00ff88" : "inherit",
                        }}
                      />
                      {!effectiveCollapsed && (
                        <span className="truncate font-normal text-[13px]">{item.label}</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom status */}
        <div
          className="shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          {!effectiveCollapsed ? (
            <div className="p-3">
              <div
                className="rounded-lg p-3"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span
                      className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00ff88]"
                      style={{ boxShadow: "0 0 4px rgba(0,255,136,0.5)" }}
                    />
                  </span>
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: "rgba(0,255,136,0.75)" }}
                  >
                    All Systems Operational
                  </span>
                </div>
                <p
                  className="text-[10px] leading-relaxed"
                  style={{
                    color: "rgba(71,85,105,0.75)",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  10 services monitored
                </p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-3">
              <span className="relative flex h-2 w-2">
                <span
                  className="relative inline-flex h-2 w-2 rounded-full bg-[#00ff88]"
                  style={{ boxShadow: "0 0 4px rgba(0,255,136,0.5)" }}
                />
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
