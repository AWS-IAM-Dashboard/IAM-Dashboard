import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { cn } from "./utils";

export type MobileQuickBarItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  to?: string;
  onClick?: () => void;
};

type MobileQuickBarProps = {
  items: MobileQuickBarItem[];
  className?: string;
};

/**
 * Fixed bottom strip for small screens only — essentials users need in a hurry.
 * Desktop uses full navigation; this stays `md:hidden` by default.
 */
export function MobileQuickBar({ items, className }: MobileQuickBarProps) {
  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-around gap-0.5 border-t border-white/10 bg-black/90 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl md:hidden",
        className,
      )}
      aria-label="Quick actions"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const inner = (
          <>
            <Icon className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
            <span className="max-w-[4.5rem] truncate text-center text-[10px] font-medium leading-tight text-gray-300">
              {item.label}
            </span>
          </>
        );
        const base =
          "flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-gray-200 transition-colors hover:bg-white/5 active:bg-white/10";
        if (item.to) {
          return (
            <Link key={item.key} to={item.to} className={base}>
              {inner}
            </Link>
          );
        }
        return (
          <button key={item.key} type="button" onClick={item.onClick} className={base}>
            {inner}
          </button>
        );
      })}
    </nav>
  );
}
