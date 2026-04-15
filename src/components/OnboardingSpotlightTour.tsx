import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";

type TourStep = {
  id: string;
  selector: string;
  title: string;
  description: string;
  tab?: string;
};

const STEP_ADVANCE_DELAY_MS = 380;
const SPOTLIGHT_PADDING = 10;
const SPOTLIGHT_RADIUS = 12;
const TOOLTIP_WIDTH = 320;
const TOOLTIP_HEIGHT = 170;
const TOOLTIP_MARGIN = 14;

const STEPS: TourStep[] = [
  {
    id: "security-overview",
    selector: '[data-tour="sidebar-security-overview"]',
    tab: "dashboard",
    title: "Start at Security Overview",
    description: "This is your command center. Use this tab to launch scans and monitor posture in one place.",
  },
  {
    id: "full-security-scan",
    selector: '[data-tour="full-security-scan"]',
    tab: "dashboard",
    title: "Run Full Security Scan",
    description: "Click here to run a full environment scan. Progress and findings update after completion.",
  },
  {
    id: "open-findings",
    selector: '[data-tour="open-findings-kpi"]',
    tab: "dashboard",
    title: "Review Open Findings",
    description: "Use this KPI card to jump directly into findings that need triage and remediation.",
  },
  {
    id: "security-alerts",
    selector: '[data-tour="sidebar-security-alerts"]',
    tab: "alerts",
    title: "Open Security Alerts",
    description: "This view is where you track and action alerts across services and severity levels.",
  },
  {
    id: "mode-toggle",
    selector: '[data-tour="mode-toggle"]',
    tab: "dashboard",
    title: "Switch IR and Audit Views",
    description: "Toggle between IR Mode for response workflow and Audit mode for compliance context.",
  },
  {
    id: "region-pill",
    selector: '[data-tour="region-pill"]',
    title: "Confirm Region Context",
    description: "This region context helps explain where data is being visualized during your walkthrough.",
  },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export type OnboardingSpotlightTourProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (tab: string) => void;
  /** Optional: launch a deeper guided tour after first-run onboarding (e.g. ProductTour). */
  onStartTour?: () => void;
};

export function OnboardingSpotlightTour({ open, onOpenChange, onNavigate, onStartTour }: OnboardingSpotlightTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const tourRef = useRef<HTMLElement | null>(null);

  const currentStep = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const refreshTarget = useCallback(() => {
    const element = document.querySelector(currentStep.selector) as HTMLElement | null;
    if (!element) {
      setTargetRect(null);
      return false;
    }
    const nextRect = element.getBoundingClientRect();
    setTargetRect(nextRect);
    return true;
  }, [currentStep.selector]);

  const ensureTargetVisible = useCallback(() => {
    const element = document.querySelector(currentStep.selector) as HTMLElement | null;
    if (!element) {
      setTargetRect(null);
      return false;
    }
    element.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
    const nextRect = element.getBoundingClientRect();
    setTargetRect(nextRect);
    return true;
  }, [currentStep.selector]);

  const resolveCurrentStep = useCallback(() => {
    if (!open) return;
    if (currentStep.tab) {
      onNavigate?.(currentStep.tab);
    }
    const timeout = window.setTimeout(() => {
      const found = ensureTargetVisible();
      if (!found && stepIndex < STEPS.length - 1) {
        setStepIndex((prev) => prev + 1);
      }
    }, STEP_ADVANCE_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [open, currentStep.tab, ensureTargetVisible, stepIndex, onNavigate]);

  useEffect(() => {
    if (!open) return;
    return resolveCurrentStep();
  }, [open, resolveCurrentStep]);

  useEffect(() => {
    if (!open) return;
    const handleRecalc = () => {
      void refreshTarget();
    };
    window.addEventListener("resize", handleRecalc);
    window.addEventListener("scroll", handleRecalc, true);
    return () => {
      window.removeEventListener("resize", handleRecalc);
      window.removeEventListener("scroll", handleRecalc, true);
    };
  }, [open, refreshTarget]);

  useEffect(() => {
    if (!open || !targetRect) return;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const preferredLeft = targetRect.right + TOOLTIP_MARGIN;
    const fallbackLeft = targetRect.left - TOOLTIP_WIDTH - TOOLTIP_MARGIN;
    const canUseRight = preferredLeft + TOOLTIP_WIDTH <= viewportWidth - 12;
    const left = canUseRight ? preferredLeft : fallbackLeft;
    const top = clamp(
      targetRect.top + targetRect.height / 2 - TOOLTIP_HEIGHT / 2,
      12,
      Math.max(12, viewportHeight - TOOLTIP_HEIGHT - 12),
    );
    setTooltipPos({
      top,
      left: clamp(left, 12, Math.max(12, viewportWidth - TOOLTIP_WIDTH - 12)),
    });
  }, [open, targetRect]);

  useEffect(() => {
    if (!open) return;
    const handleKeys = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const insideTour = !!(target && tourRef.current?.contains(target));
      const interactiveSelector = "button, a, input, textarea, select, [role='button']";
      const isInteractive =
        !!target &&
        (target.isContentEditable || !!target.closest(interactiveSelector));

      if (event.key === "Escape") {
        onOpenChange(false);
        return;
      }
      if (!insideTour && isInteractive) return;
      if (event.key === "Enter" || event.key === "ArrowRight") {
        event.preventDefault();
        if (isLast) {
          onOpenChange(false);
        } else {
          setStepIndex((s) => Math.min(s + 1, STEPS.length - 1));
        }
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setStepIndex((s) => Math.max(s - 1, 0));
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [open, isLast, onOpenChange]);

  useEffect(() => {
    if (open) {
      setStepIndex(0);
    }
  }, [open]);

  const spotlightStyle = useMemo(() => {
    if (!targetRect) return { display: "none" };
    return {
      top: targetRect.top - SPOTLIGHT_PADDING,
      left: targetRect.left - SPOTLIGHT_PADDING,
      width: targetRect.width + SPOTLIGHT_PADDING * 2,
      height: targetRect.height + SPOTLIGHT_PADDING * 2,
      borderRadius: SPOTLIGHT_RADIUS,
      boxShadow: "0 0 0 9999px rgba(2, 6, 18, 0.74)",
    };
  }, [targetRect]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="First-run spotlight tour">
      <div className="absolute inset-0" style={{ background: "rgba(2, 6, 18, 0.4)" }} />
      <div
        className="pointer-events-none absolute border border-[#00ff88]/60 bg-transparent shadow-[0_0_0_1px_rgba(0,255,136,0.35),0_0_28px_rgba(0,255,136,0.28)] transition-all duration-200"
        style={spotlightStyle}
      />

      <aside
        ref={tourRef}
        className={cn(
          "absolute w-[320px] rounded-xl border border-white/10 bg-[rgba(8,12,24,0.98)] p-4 text-slate-100 shadow-2xl backdrop-blur-md",
        )}
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
      >
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Step {stepIndex + 1} of {STEPS.length}
        </p>
        <h2 className="mt-2 text-base font-semibold text-slate-100">{currentStep.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{currentStep.description}</p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:bg-white/5 hover:text-slate-200"
            onClick={() => onOpenChange(false)}
          >
            Skip
          </Button>
          <div className="flex flex-wrap justify-end gap-2">
            {!isFirst && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-white/15 bg-transparent text-slate-200 hover:bg-white/10"
                onClick={() => setStepIndex((s) => Math.max(s - 1, 0))}
              >
                Back
              </Button>
            )}
            {isLast && onStartTour && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                onClick={() => {
                  onOpenChange(false);
                  onStartTour();
                }}
              >
                Start guided tour
                <ChevronRight className="ml-0.5 size-3" />
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              className="bg-[#00ff88]/15 text-[#00ff88] hover:bg-[#00ff88]/25"
              onClick={() => (isLast ? onOpenChange(false) : setStepIndex((s) => Math.min(s + 1, STEPS.length - 1)))}
            >
              {isLast ? "Finish" : "Next"}
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
