import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { Button } from "./ui/button";
import { ChevronRight, ChevronLeft, X, Sparkles } from "lucide-react";
import { cn } from "./ui/utils";

export interface TourStep {
  target: string;
  title: string;
  description: string;
  icon: ReactNode;
  hint?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  placement?: "top" | "bottom";
}

interface PageTourProps {
  steps: TourStep[];
  onFinish?: () => void;
  welcomeTitle: string;
  welcomeDescription: string;
  welcomeIcon: ReactNode;
}

interface ViewportRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 12;
const GAP = 16;

function getViewportRect(target: string): ViewportRect | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function scrollTargetIntoView(target: string): Promise<void> {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return Promise.resolve();

  el.scrollIntoView({ behavior: "smooth", block: "center" });

  // Wait for smooth scroll to finish
  return new Promise((resolve) => {
    let settled = 0;
    let lastY = el.getBoundingClientRect().top;
    const check = () => {
      const y = el.getBoundingClientRect().top;
      if (Math.abs(y - lastY) < 1) {
        settled++;
        if (settled >= 3) { resolve(); return; }
      } else {
        settled = 0;
      }
      lastY = y;
      requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
    // Safety timeout
    setTimeout(resolve, 1200);
  });
}

export function PageTour({
  steps,
  onFinish,
  welcomeTitle,
  welcomeDescription,
  welcomeIcon,
}: PageTourProps) {
  type Phase = "welcome" | "touring" | "minimized";
  const [phase, setPhase] = useState<Phase>("welcome");
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<ViewportRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];

  const measure = useCallback(() => {
    if (phase !== "touring") return;
    setRect(getViewportRect(steps[currentStep]?.target ?? ""));
  }, [phase, currentStep, steps]);

  useEffect(() => {
    if (phase !== "touring") return;
    let cancelled = false;

    // Immediately clear rect so the overlay hides while scrolling
    setRect(null);

    scrollTargetIntoView(steps[currentStep]?.target ?? "").then(() => {
      if (!cancelled) measure();
    });

    return () => { cancelled = true; };
  }, [phase, currentStep, steps, measure]);

  useEffect(() => {
    if (phase !== "touring") return;
    const update = () => measure();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    const id = setInterval(update, 250);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      clearInterval(id);
    };
  }, [phase, measure]);

  const goNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep((p) => p + 1);
    else setPhase("minimized");
  };
  const goBack = () => {
    if (currentStep > 0) setCurrentStep((p) => p - 1);
  };
  const startTour = () => {
    setCurrentStep(0);
    setPhase("touring");
  };
  const dismiss = () => {
    setPhase("minimized");
    onFinish?.();
  };

  // ── Welcome splash ──
  if (phase === "welcome") {
    return (
      <div className="tour-welcome-card cyber-card rounded-xl border border-primary/30 p-6 sm:p-8">
        <div className="mx-auto max-w-lg text-center space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary tour-icon-pulse">
            {welcomeIcon}
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">{welcomeTitle}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {welcomeDescription}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button onClick={startTour} className="cyber-glow gap-2">
              <Sparkles className="h-4 w-4" />
              Take the Tour
            </Button>
            <Button variant="ghost" size="sm" onClick={dismiss} className="text-muted-foreground">
              Skip for now
            </Button>
          </div>
          <p className="text-xs text-muted-foreground/60">
            {steps.length} quick steps &middot; takes under a minute
          </p>
        </div>
      </div>
    );
  }

  // ── Minimized bar ──
  if (phase === "minimized") {
    return (
      <div className="tour-minimized-bar">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>Tour available</span>
        </div>
        <Button variant="ghost" size="sm" onClick={startTour} className="h-7 gap-1.5 text-xs text-primary hover:text-primary">
          <Sparkles className="h-3 w-3" />
          Start Tour
        </Button>
      </div>
    );
  }

  // ── Active tour ──

  // Build 4 overlay rects around the spotlight hole (avoids clip-path artifacts)
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let overlayRects: React.CSSProperties[] = [];

  if (rect) {
    const st = Math.max(0, rect.top - PAD);
    const sl = Math.max(0, rect.left - PAD);
    const sb = Math.min(vh, rect.top + rect.height + PAD);
    const sr = Math.min(vw, rect.left + rect.width + PAD);

    overlayRects = [
      { top: 0, left: 0, width: vw, height: st },                   // top
      { top: sb, left: 0, width: vw, height: vh - sb },              // bottom
      { top: st, left: 0, width: sl, height: sb - st },              // left
      { top: st, left: sr, width: vw - sr, height: sb - st },        // right
    ];
  } else {
    overlayRects = [{ top: 0, left: 0, width: vw, height: vh }];
  }

  // Tooltip positioning
  const isMobile = vw < 640;
  let tooltipStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 10000,
  };

  if (isMobile) {
    // Mobile: fixed bottom card, always visible
    tooltipStyle.bottom = 0;
    tooltipStyle.left = 0;
    tooltipStyle.right = 0;
    tooltipStyle.width = "100%";
    tooltipStyle.borderRadius = "14px 14px 0 0";
    tooltipStyle.maxHeight = "55vh";
    tooltipStyle.overflowY = "auto";
  } else if (rect) {
    const tooltipW = Math.min(380, vw - 32);
    const centerX = rect.left + rect.width / 2;
    let left = centerX - tooltipW / 2;
    left = Math.max(16, Math.min(left, vw - tooltipW - 16));

    const placement = step?.placement ?? "bottom";
    const spaceBelow = vh - (rect.top + rect.height + PAD + GAP);
    const spaceAbove = rect.top - PAD - GAP;
    const preferBottom = placement === "bottom" ? spaceBelow > 180 : spaceAbove < 180;

    if (preferBottom) {
      let top = rect.top + rect.height + PAD + GAP;
      top = Math.min(top, vh - 200);
      tooltipStyle.top = top;
      tooltipStyle.left = left;
      tooltipStyle.width = tooltipW;
    } else {
      let bottom = vh - rect.top + PAD + GAP;
      bottom = Math.min(bottom, vh - 60);
      tooltipStyle.bottom = bottom;
      tooltipStyle.left = left;
      tooltipStyle.width = tooltipW;
    }
  } else {
    tooltipStyle.top = "50%";
    tooltipStyle.left = "50%";
    tooltipStyle.transform = "translate(-50%, -50%)";
    tooltipStyle.width = Math.min(380, vw - 32);
  }

  return (
    <>
      {/* 4 overlay rects forming the dimmed surround */}
      {overlayRects.map((style, i) => (
        <div
          key={i}
          className="tour-overlay-rect"
          style={{ ...style, position: "fixed", zIndex: 9998 }}
        />
      ))}

      {/* Highlight ring */}
      {rect && (
        <div
          className="tour-highlight-ring"
          style={{
            position: "fixed",
            zIndex: 9999,
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="tour-tooltip"
        style={tooltipStyle}
        key={currentStep}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
              {step.icon}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Step {currentStep + 1} of {steps.length}
              </p>
              <h3 className="text-sm font-semibold leading-tight">{step.title}</h3>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-1">
          {step.description}
        </p>

        {step.hint && (
          <p className="text-xs text-primary/70 italic mb-3">
            {step.hint}
          </p>
        )}

        {step.action && (
          <div className="mb-3">
            <Button
              size="sm"
              onClick={step.action.onClick}
              className="cyber-glow gap-1.5"
            >
              {step.action.icon}
              {step.action.label}
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border/50 pt-3 mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            disabled={currentStep === 0}
            className={cn("h-8 px-2 text-xs", currentStep === 0 && "invisible")}
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
            Back
          </Button>

          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === currentStep
                    ? "w-4 bg-primary"
                    : i < currentStep
                      ? "w-1.5 bg-primary/50"
                      : "w-1.5 bg-border",
                )}
              />
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={goNext}
            className="h-8 px-2 text-xs"
          >
            {currentStep === steps.length - 1 ? "Finish" : "Next"}
            <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
          </Button>
        </div>
      </div>
    </>
  );
}
