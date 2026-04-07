import { useEffect, useState, type ReactNode } from "react";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { AlertTriangle, BookOpen, Cloud, LayoutDashboard, ListTree, Play, Sparkles, X } from "lucide-react";
import { cn } from "./ui/utils";

const STEP_COUNT = 5;

function UiKbd({ children }: { children: ReactNode }) {
  return (
    <span className="mx-0.5 inline-block rounded border border-white/20 bg-white/[0.07] px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-200">
      {children}
    </span>
  );
}

type StepDef = {
  title: string;
  description: string;
  checklist?: ReactNode[];
  icon: typeof Sparkles;
  goThereTab?: string;
  goThereLabel?: string;
  /** Optional second jump (e.g. overview + alerts). */
  goThereTab2?: string;
  goThereLabel2?: string;
};

const STEPS: StepDef[] = [
  {
    title: "Welcome to IAM Dashboard",
    description:
      "This tour walks through the exact controls to connect AWS, run a scan, and read results. Skip or close anytime—you will not see this again unless you clear site data.",
    checklist: [
      <>
        Use the sidebar on the left to move between <UiKbd>Security Overview</UiKbd>, service modules, and{" "}
        <UiKbd>Settings</UiKbd>.
      </>,
      <>
        After each step below, use <UiKbd>Open …</UiKbd> in this dialog to jump to the right page, then follow the numbered
        actions on that screen.
      </>,
    ],
    icon: Sparkles,
  },
  {
    title: "Connect your AWS account",
    description: "Wire credentials in Settings before scans mean anything in a live environment.",
    checklist: [
      <>
        In the sidebar under <strong>Operations</strong>, click <UiKbd>Settings</UiKbd> (gear icon).
      </>,
      <>
        In the left <strong>Sections</strong> column, select <UiKbd>AWS Account</UiKbd> (selected by default).
      </>,
      <>
        Set <strong>Default Region</strong> and <strong>AWS Profile Name</strong>, or switch <strong>Credential Method</strong>{" "}
        to <UiKbd>Access Keys</UiKbd> or <UiKbd>IAM Role</UiKbd> and fill in the fields.
      </>,
      <>
        Click <UiKbd>Test Connection</UiKbd>. When it succeeds, use <UiKbd>Save Settings</UiKbd> at the bottom of the page.
      </>,
    ],
    icon: Cloud,
    goThereTab: "settings",
    goThereLabel: "Open Settings",
  },
  {
    title: "Run a security scan",
    description: "Scans start from Security Overview—the home dashboard after login.",
    checklist: [
      <>
        Open <UiKbd>Security Overview</UiKbd> in the sidebar (top item).
      </>,
      <>
        In the page header (top right), optionally switch <UiKbd>IR Mode</UiKbd> or <UiKbd>Audit</UiKbd> to change how
        findings and KPIs are framed.
      </>,
      <>
        Click the green <UiKbd>Full Security Scan</UiKbd> button (play icon). While it runs, the label changes to{" "}
        <UiKbd>Scanning…</UiKbd> and a percentage appears beside it.
      </>,
      <>
        To refresh summary numbers without a full scan, use the square <UiKbd>refresh</UiKbd> icon button immediately to the
        left of <UiKbd>Full Security Scan</UiKbd>.
      </>,
    ],
    icon: Play,
    goThereTab: "dashboard",
    goThereLabel: "Go to Security Overview",
  },
  {
    title: "View scan results & findings",
    description: "Results surface on the same overview and in dedicated alert views.",
    checklist: [
      <>
        After a scan finishes, watch for a <strong>SCAN DELTA</strong> banner—you can click <UiKbd>dismiss</UiKbd> to clear it.
      </>,
      <>
        In <UiKbd>IR Mode</UiKbd>, scroll to the <strong>Triage Queue</strong> table. Click any row to expand it; the detail
        panel supports assignee, workflow status, and triage actions.
      </>,
      <>
        Click KPI tiles (for example <UiKbd>OPEN FINDINGS</UiKbd> or <UiKbd>CRITICAL</UiKbd>) to navigate to related areas.
      </>,
      <>
        For an alert-style list, use the sidebar <UiKbd>Security Alerts</UiKbd> under Operations (or use{" "}
        <UiKbd>Open Security Alerts</UiKbd> below).
      </>,
    ],
    icon: ListTree,
    goThereTab: "dashboard",
    goThereLabel: "Go to Security Overview",
    goThereTab2: "alerts",
    goThereLabel2: "Open Security Alerts",
  },
  {
    title: "Get help & navigate",
    description: "Documentation and product context live outside the authenticated shell; configuration stays in Settings.",
    checklist: [
      <>
        Click <UiKbd>About &amp; help</UiKbd> below to open the public <strong>About</strong> page in a new tab.
      </>,
      <>
        Scan schedules, notification toggles, and display options are under <UiKbd>Settings</UiKbd> → sections like{" "}
        <UiKbd>Scan Settings</UiKbd> and <UiKbd>Notifications</UiKbd>.
      </>,
      <>
        Deep-dive modules (IAM, S3, Security Hub, etc.) are listed in the sidebar—open any item to explore that surface.
      </>,
    ],
    icon: BookOpen,
  },
];

export type OnboardingWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (tab: string) => void;
};

export function OnboardingWizard({ open, onOpenChange, onNavigate }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const isLast = step === STEP_COUNT - 1;
  const def = STEPS[step];
  const Icon = def.icon;
  const progress = ((step + 1) / STEP_COUNT) * 100;

  const goThere = (tab?: string) => {
    const t = tab ?? def.goThereTab;
    if (t && onNavigate) onNavigate(t);
  };

  const openAbout = () => {
    window.open("/about", "_blank", "noopener,noreferrer");
  };

  if (!open) return null;

  return (
    <aside
      className={cn(
        "fixed bottom-4 right-4 z-50 w-[min(92vw,42rem)] overflow-hidden rounded-xl border border-white/10 bg-[rgba(8,12,24,0.98)] text-slate-100 shadow-2xl",
        "backdrop-blur-md",
      )}
      role="dialog"
      aria-label="Onboarding wizard"
      aria-modal="false"
    >
      <div className="flex max-h-[min(88vh,680px)] flex-col">
        <div className="shrink-0 border-b border-white/10 px-6 pb-4 pt-6">
          <div className="mb-4 flex items-center gap-3">
            <Progress
              value={progress}
              className="h-1 flex-1 bg-white/10 [&_[data-slot=progress-indicator]]:bg-[#00ff88]"
            />
            <button
              type="button"
              aria-label="Close onboarding"
              className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-slate-200"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="space-y-3 text-left">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#00ff88]/25 bg-[#00ff88]/10"
              aria-hidden
            >
              <Icon className="h-5 w-5 text-[#00ff88]" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-100">{def.title}</h2>
            <p className="text-sm leading-relaxed text-slate-400">{def.description}</p>
          </div>
        </div>

        {def.checklist && def.checklist.length > 0 && (
          <div className="min-h-0 flex-1 overflow-y-auto border-b border-white/10 px-6 py-4">
            <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              What to click
            </p>
            <ol className="list-decimal space-y-3 pl-4 text-sm leading-relaxed text-slate-300 marker:text-slate-500">
              {def.checklist.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          </div>
        )}

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 px-6 py-3">
          {def.goThereTab && def.goThereLabel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
              onClick={() => goThere(def.goThereTab)}
            >
              {def.goThereTab === "dashboard" ? (
                <LayoutDashboard className="size-4" />
              ) : def.goThereTab === "settings" ? (
                <Cloud className="size-4" />
              ) : def.goThereTab === "alerts" ? (
                <AlertTriangle className="size-4" />
              ) : null}
              {def.goThereLabel}
            </Button>
          )}
          {def.goThereTab2 && def.goThereLabel2 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
              onClick={() => goThere(def.goThereTab2)}
            >
              {def.goThereTab2 === "alerts" ? <AlertTriangle className="size-4" /> : null}
              {def.goThereLabel2}
            </Button>
          )}
          {isLast && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
              onClick={openAbout}
            >
              <BookOpen className="size-4" />
              About &amp; help
            </Button>
          )}
          <span className="ml-auto font-mono text-[11px] text-slate-500">
            {step + 1} / {STEP_COUNT}
          </span>
        </div>

        <div className="shrink-0 flex-row flex-wrap items-center justify-between gap-2 border-t border-white/5 bg-black/20 px-6 py-4 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:bg-white/5 hover:text-slate-200"
            onClick={() => onOpenChange(false)}
          >
            Skip tour
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-white/15 bg-transparent text-slate-200 hover:bg-white/10"
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </Button>
            )}
            {isLast ? (
              <Button
                type="button"
                size="sm"
                className="bg-[#00ff88]/15 text-[#00ff88] hover:bg-[#00ff88]/25"
                onClick={() => onOpenChange(false)}
              >
                Get started
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                className="bg-[#00ff88]/15 text-[#00ff88] hover:bg-[#00ff88]/25"
                onClick={() => setStep((s) => s + 1)}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
