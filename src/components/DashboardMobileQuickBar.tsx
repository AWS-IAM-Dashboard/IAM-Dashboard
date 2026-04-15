import { LayoutDashboard, Bell, Settings, PanelLeft } from "lucide-react";
import { MobileQuickBar } from "./ui/MobileQuickBar";
import { cn } from "./ui/utils";

type DashboardMobileQuickBarProps = {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenFullNav: () => void;
  className?: string;
};

/**
 * High-traffic dashboard destinations on mobile only. Full module list stays in the sidebar (More).
 */
export function DashboardMobileQuickBar({
  activeTab,
  onTabChange,
  onOpenFullNav,
  className,
}: DashboardMobileQuickBarProps) {
  const tabBtn = (tab: string, label: string, Icon: typeof LayoutDashboard) => (
    <button
      key={tab}
      type="button"
      onClick={() => onTabChange(tab)}
      className={cn(
        "flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 transition-colors",
        activeTab === tab
          ? "bg-[rgba(0,255,136,0.12)] text-[#00ff88]"
          : "text-gray-300 hover:bg-white/5 active:bg-white/10",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      <span className="max-w-[4.5rem] truncate text-center text-[10px] font-medium leading-tight">{label}</span>
    </button>
  );

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-around gap-0.5 border-t border-white/10 bg-[rgba(6,9,18,0.95)] px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl md:hidden",
        className,
      )}
      aria-label="Dashboard quick navigation"
    >
      {tabBtn("dashboard", "Overview", LayoutDashboard)}
      {tabBtn("alerts", "Alerts", Bell)}
      {tabBtn("settings", "Settings", Settings)}
      <button
        type="button"
        onClick={onOpenFullNav}
        className="flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-gray-300 transition-colors hover:bg-white/5 active:bg-white/10"
        aria-label="Open full navigation"
      >
        <PanelLeft className="h-5 w-5 shrink-0" aria-hidden />
        <span className="max-w-[4.5rem] truncate text-center text-[10px] font-medium leading-tight">More</span>
      </button>
    </nav>
  );
}
