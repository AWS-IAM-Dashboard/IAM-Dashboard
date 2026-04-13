/**
 * ProductTour — Spotlight-based guided walkthrough
 *
 * 5-step focused tour: Security Overview → IR/Audit Mode → Triage Queue
 * → AI Runbooks → Argus Voice Agent.
 *
 * Tooltip placement supports top / bottom / right, with automatic fallback
 * when the preferred side has insufficient viewport space.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, ChevronRight, ChevronLeft, Lightbulb, Mic,
  Shield, LayoutDashboard, ShieldAlert, Zap,
} from "lucide-react";

// ─── CSS ─────────────────────────────────────────────────────────────────────

const TOUR_CSS = `
  @keyframes pt-ring-pulse {
    0%,100% { opacity: 1; }
    50%      { opacity: 0.55; }
  }
  @keyframes pt-tooltip-in {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pt-overlay-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes pt-dot-blink {
    0%,100% { opacity: 1; }
    50%      { opacity: 0.2; }
  }
  .pt-ring { animation: pt-ring-pulse 2s ease-in-out infinite; }
`;

// ─── Step definitions ─────────────────────────────────────────────────────────

interface TourStep {
  id: string;
  tab?: string;
  selector: string;
  label: string;
  title: string;
  body: string;
  tip?: string;
  placement?: "auto" | "top" | "bottom" | "right";
  pad?: number;
  icon: typeof Shield;
  color: string;
}

const STEPS: TourStep[] = [
  {
    id: "overview",
    tab: "dashboard",
    selector: '[data-tour="scan-button"]',
    label: "GETTING STARTED",
    title: "Security Command Center",
    body: "This is your security posture at a glance. KPI tiles surface Open Findings, Critical, High, and Compliance score live. Hit Full Security Scan to interrogate all 8 AWS services simultaneously — IAM, EC2, S3, VPC, DynamoDB, SecurityHub, GuardDuty, and Config.",
    tip: "In mock mode results populate instantly. In production, a full scan takes 30–90 s depending on account size.",
    placement: "bottom",
    pad: 10,
    icon: Zap,
    color: "#00ff88",
  },
  {
    id: "mode-toggle",
    tab: "dashboard",
    selector: '[data-tour="mode-toggle"]',
    label: "OPERATIONAL CONTEXT",
    title: "IR Mode vs Audit Mode",
    body: "IR Mode is for active responders — Triage Queue, SLA countdowns, workflow pipeline, and threat level. Audit Mode is for compliance teams — framework scorecards, a live compliance globe, and control-failure mappings.",
    tip: "Switch freely. Your selection persists across page refreshes.",
    placement: "bottom",
    pad: 10,
    icon: LayoutDashboard,
    color: "#0ea5e9",
  },
  {
    id: "triage-queue",
    tab: "dashboard",
    selector: '[data-tour="triage-queue"]',
    label: "ACTIVE RESPONSE",
    title: "Triage Queue — Your Daily Driver",
    body: "Every finding is ranked by severity and SLA urgency. The queue is your primary workspace in IR Mode — it shows assignee, workflow status, and time-to-breach at a glance.",
    tip: "Make sure IR Mode is active (top toggle) to see the full triage queue with SLA timers.",
    placement: "right",
    pad: 8,
    icon: ShieldAlert,
    color: "#ff0040",
  },
  {
    id: "argus",
    selector: '[data-tour="argus-trigger"]',
    label: "VOICE INTELLIGENCE",
    title: "Argus — Your Voice IR Co-Pilot",
    body: "Hold the mic and speak a command. Argus classifies intent via LLM, queries live findings, and responds via AWS Polly Neural TTS. High-impact actions — isolate, revoke, disable — require explicit verbal confirmation before executing.",
    tip: 'Try: "Brief me on the threat level" · "Show critical findings" · "What is the SLA status?"',
    placement: "bottom",
    pad: 12,
    icon: Mic,
    color: "#00d4ff",
  },
];

// ─── Geometry helpers ─────────────────────────────────────────────────────────

const TOOLTIP_W = 360;
const TOOLTIP_H_EST = 280; // estimated height for placement math

interface TooltipPos {
  left: number;
  top: number;
  placement: "top" | "bottom" | "right";
  // used by top/bottom arrows
  arrowLeft?: number;
  // used by right arrow
  arrowTop?: number;
}

function calcTooltip(
  rect: DOMRect,
  pad: number,
  preferred: TourStep["placement"],
): TooltipPos {
  const vw      = window.innerWidth;
  const vh      = window.innerHeight;
  const margin  = 12;
  const arrowSz = 10;
  const w       = Math.min(TOOLTIP_W, vw - margin * 2);

  // ── Right placement ───────────────────────────────────────────────────
  if (preferred === "right") {
    const spaceRight = vw - (rect.right + pad);
    if (spaceRight >= w + arrowSz + margin) {
      const left = rect.right + pad + arrowSz;
      let top    = rect.top + rect.height / 2 - TOOLTIP_H_EST / 2;
      top = Math.max(margin, Math.min(vh - TOOLTIP_H_EST - margin, top));
      const arrowTop = (rect.top + rect.height / 2) - top - 7;
      return { left, top, placement: "right", arrowTop };
    }
    // fall through to auto (below)
  }

  // ── Top / Bottom placement ────────────────────────────────────────────
  const y1 = rect.top    - pad;
  const y2 = rect.bottom + pad;

  let placement: "top" | "bottom";
  if (preferred === "top") {
    placement = "top";
  } else if (preferred === "bottom") {
    placement = "bottom";
  } else {
    // auto: prefer below, fall back above
    const spaceBelow = vh - y2;
    const spaceAbove = y1;
    placement = spaceBelow >= TOOLTIP_H_EST + arrowSz + margin ? "bottom"
      : spaceAbove >= TOOLTIP_H_EST + arrowSz + margin ? "top"
      : "bottom";
  }

  const targetCx = rect.left + rect.width / 2;
  let left = targetCx - w / 2;
  left = Math.max(margin, Math.min(vw - w - margin, left));
  const arrowLeft = Math.max(20, Math.min(w - 20, targetCx - left));

  const top = placement === "bottom"
    ? y2 + arrowSz + 2
    : y1 - TOOLTIP_H_EST - arrowSz - 2;
  const clampedTop = Math.max(margin, Math.min(vh - TOOLTIP_H_EST - margin, top));

  return { left, top: clampedTop, placement, arrowLeft };
}

function buildClipPath(rect: DOMRect, pad: number): string {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const x1 = Math.max(0, rect.left   - pad);
  const y1 = Math.max(0, rect.top    - pad);
  const x2 = Math.min(vw, rect.right  + pad);
  const y2 = Math.min(vh, rect.bottom + pad);
  return `polygon(0px 0px, 0px ${vh}px, ${x1}px ${vh}px, ${x1}px ${y1}px, ${x2}px ${y1}px, ${x2}px ${y2}px, ${x1}px ${y2}px, ${x1}px ${vh}px, ${vw}px ${vh}px, ${vw}px 0px)`;
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface ProductTourProps {
  active: boolean;
  onClose: () => void;
  onNavigate?: (tab: string) => void;
}

export function ProductTour({ active, onClose, onNavigate }: ProductTourProps) {
  const [step,       setStep]       = useState(0);
  const [rect,       setRect]       = useState<DOMRect | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [tooltipKey, setTooltipKey] = useState(0);

  const observerRef = useRef<ResizeObserver | null>(null);
  const pollRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cur     = STEPS[step];
  const isFirst = step === 0;
  const isLast  = step === STEPS.length - 1;
  const CurIcon = cur.icon;

  // Reset to step 0 when tour opens
  useEffect(() => {
    if (active) setStep(0);
  }, [active]);

  const attachToElement = useCallback((el: Element) => {
    const updateRect = () => setRect(el.getBoundingClientRect());
    updateRect();
    observerRef.current?.disconnect();
    observerRef.current = new ResizeObserver(updateRect);
    observerRef.current.observe(el);
    observerRef.current.observe(document.documentElement);
  }, []);

  const findElement = useCallback(async (
    selector: string,
    maxMs = 2200,
  ): Promise<Element | null> => {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      const el = document.querySelector(selector);
      if (el) return el;
      await new Promise(r => { pollRef.current = setTimeout(r, 120); });
    }
    return null;
  }, []);

  useEffect(() => {
    if (!active) return;

    setRect(null);
    setLoading(true);
    setTooltipKey(k => k + 1);

    observerRef.current?.disconnect();
    if (pollRef.current) clearTimeout(pollRef.current);

    const go = async () => {
      if (cur.tab && onNavigate) {
        onNavigate(cur.tab);
        await new Promise(r => setTimeout(r, 300));
      }
      const el = await findElement(cur.selector);
      setLoading(false);
      if (el) {
        attachToElement(el);
        // Scroll element into view, but don't scroll horizontally for right-placed tooltips
        el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      }
    };

    go();
  }, [step, active, cur.tab, cur.selector, onNavigate, findElement, attachToElement]);

  useEffect(() => {
    if (!active) return;
    const update = () => {
      const el = document.querySelector(cur.selector);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize",  update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize",  update);
    };
  }, [active, cur.selector]);

  useEffect(() => {
    if (!active) {
      observerRef.current?.disconnect();
      if (pollRef.current) clearTimeout(pollRef.current);
    }
  }, [active]);

  const advance = () => { if (isLast) { onClose(); return; } setStep(s => s + 1); };
  const retreat = () => { if (!isFirst) setStep(s => s - 1); };

  if (!active) return null;

  const pad     = cur.pad ?? 10;
  const tipPos  = rect ? calcTooltip(rect, pad, cur.placement ?? "auto") : null;
  const clip    = rect ? buildClipPath(rect, pad) : null;
  const tipW    = Math.min(TOOLTIP_W, window.innerWidth - 24);

  // Highlight ring
  const ringStyle: React.CSSProperties = rect ? {
    position: "fixed",
    left:   rect.left   - pad - 1,
    top:    rect.top    - pad - 1,
    width:  rect.width  + pad * 2 + 2,
    height: rect.height + pad * 2 + 2,
    border: `2px solid ${cur.color}`,
    borderRadius: 10,
    pointerEvents: "none",
    zIndex: 10002,
    transition: [
      "left 0.35s cubic-bezier(0.4,0,0.2,1)",
      "top 0.35s cubic-bezier(0.4,0,0.2,1)",
      "width 0.35s cubic-bezier(0.4,0,0.2,1)",
      "height 0.35s cubic-bezier(0.4,0,0.2,1)",
    ].join(", "),
    boxShadow: `0 0 0 1px ${cur.color}20`,
  } : {};

  return (
    <>
      <style>{TOUR_CSS}</style>

      {/* Overlay — clip-path spotlight hole */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 10000,
          background: "rgba(0, 8, 20, 0.82)",
          clipPath: clip ?? undefined,
          animation: "pt-overlay-in 0.25s ease both",
          transition: "clip-path 0.35s cubic-bezier(0.4,0,0.2,1)",
        }}
      />

      {/* Loading chip */}
      {loading && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10003,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 16px", borderRadius: 6,
            background: "#0f1729",
            border: "1px solid rgba(0,255,136,0.2)",
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: "#00ff88",
              animation: "pt-dot-blink 0.8s ease-in-out infinite",
            }} />
            <span style={{
              fontFamily: "JetBrains Mono, monospace", fontSize: 11,
              color: "rgba(0,255,136,0.7)", letterSpacing: "0.1em",
            }}>
              NAVIGATING…
            </span>
          </div>
        </div>
      )}

      {/* Highlight ring */}
      {rect && !loading && (
        <div className="pt-ring" style={ringStyle} />
      )}

      {/* Tooltip card */}
      {!loading && (
        <div
          key={tooltipKey}
          onClick={e => e.stopPropagation()}
          style={{
            position: "fixed",
            left: tipPos ? tipPos.left : "50%",
            top:  tipPos ? tipPos.top  : "50%",
            transform: tipPos ? undefined : "translate(-50%, -50%)",
            width: tipW,
            zIndex: 10003,
            background: "#0f1729",
            border: `1px solid ${cur.color}28`,
            borderRadius: 10,
            boxShadow: `0 0 0 1px rgba(0,0,0,0.5), 0 0 20px ${cur.color}08`,
            overflow: "hidden",
            animation: "pt-tooltip-in 0.28s ease both",
          }}
        >
          {/* Arrows */}
          {tipPos?.placement === "bottom" && (
            <div style={{
              position: "absolute",
              left: (tipPos.arrowLeft ?? 20) - 7,
              top: -7,
              width: 0, height: 0,
              borderBottom: `7px solid ${cur.color}28`,
              borderLeft: "7px solid transparent",
              borderRight: "7px solid transparent",
            }} />
          )}
          {tipPos?.placement === "top" && (
            <div style={{
              position: "absolute",
              left: (tipPos.arrowLeft ?? 20) - 7,
              bottom: -7,
              width: 0, height: 0,
              borderTop: `7px solid ${cur.color}28`,
              borderLeft: "7px solid transparent",
              borderRight: "7px solid transparent",
            }} />
          )}
          {tipPos?.placement === "right" && (
            <div style={{
              position: "absolute",
              left: -7,
              top: (tipPos.arrowTop ?? 20),
              width: 0, height: 0,
              borderRight: `7px solid ${cur.color}28`,
              borderTop: "7px solid transparent",
              borderBottom: "7px solid transparent",
            }} />
          )}

          {/* Accent stripe */}
          <div style={{ height: 2, background: `linear-gradient(90deg, ${cur.color}, ${cur.color}00)` }} />

          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px 0",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 24, height: 24, borderRadius: 4,
                background: `${cur.color}12`, border: `1px solid ${cur.color}28`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <CurIcon size={12} color={cur.color} />
              </div>
              <div>
                <div style={{
                  fontFamily: "JetBrains Mono, monospace", fontSize: 10,
                  color: `${cur.color}80`, letterSpacing: "0.12em",
                  textTransform: "uppercase" as const,
                }}>
                  {cur.label}
                </div>
                <div style={{
                  fontFamily: "JetBrains Mono, monospace", fontSize: 10,
                  color: "rgba(100,116,139,0.5)", letterSpacing: "0.08em",
                }}>
                  STEP {String(step + 1).padStart(2, "0")} OF {String(STEPS.length).padStart(2, "0")}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close tour"
              style={{
                width: 22, height: 22, borderRadius: 4,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "rgba(100,116,139,0.55)",
                transition: "background 0.12s, color 0.12s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.09)";
                (e.currentTarget as HTMLButtonElement).style.color = "#e2e8f0";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(100,116,139,0.55)";
              }}
            >
              <X size={11} />
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: "12px 16px 0" }}>
            <h3 style={{
              fontFamily: "DM Sans, sans-serif", fontSize: 17, fontWeight: 600,
              color: "#f1f5f9", margin: "0 0 8px", lineHeight: 1.25,
              letterSpacing: "-0.02em",
            }}>
              {cur.title}
            </h3>
            <p style={{
              fontFamily: "DM Sans, sans-serif", fontSize: 13,
              color: "rgba(100,116,139,0.85)", margin: 0, lineHeight: 1.6,
            }}>
              {cur.body}
            </p>
          </div>

          {/* Tip */}
          {cur.tip && (
            <div style={{
              margin: "8px 16px 0", padding: "8px 12px", borderRadius: 6,
              background: "rgba(255,176,0,0.05)", border: "1px solid rgba(255,176,0,0.16)",
              display: "flex", alignItems: "flex-start", gap: 8,
            }}>
              <Lightbulb size={11} color="#ffb000" style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{
                fontFamily: "DM Sans, sans-serif", fontSize: 12,
                color: "rgba(255,176,0,0.85)", lineHeight: 1.6,
              }}>
                {cur.tip}
              </span>
            </div>
          )}

          {/* Footer */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px", marginTop: 8,
          }}>
            <button
              onClick={onClose}
              style={{
                fontFamily: "DM Sans, sans-serif", fontSize: 12,
                color: "rgba(100,116,139,0.5)", background: "none", border: "none",
                cursor: "pointer", padding: "4px 0", transition: "color 0.12s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(148,163,184,0.7)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(100,116,139,0.5)";
              }}
            >
              Skip tour
            </button>

            {/* Step dots */}
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              {STEPS.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setStep(i)}
                  style={{
                    width: i === step ? 16 : 5, height: 5,
                    padding: 0, border: "none", borderRadius: 3,
                    cursor: "pointer",
                    background: i === step
                      ? cur.color
                      : i < step
                        ? "rgba(0,255,136,0.3)"
                        : "rgba(255,255,255,0.1)",
                    transition: "width 0.15s, background 0.15s",
                  }}
                  aria-label={`Go to step ${i + 1}`}
                />
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {!isFirst && (
                <button
                  onClick={retreat}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "8px 12px", borderRadius: 6,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    cursor: "pointer",
                    fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 500,
                    color: "rgba(148,163,184,0.75)",
                    transition: "background 0.12s, border-color 0.12s, color 0.12s",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.14)";
                    (e.currentTarget as HTMLButtonElement).style.color = "#cbd5e1";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.08)";
                    (e.currentTarget as HTMLButtonElement).style.color = "rgba(148,163,184,0.75)";
                  }}
                >
                  <ChevronLeft size={11} /> Back
                </button>
              )}
              <button
                onClick={advance}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "8px 16px", borderRadius: 6,
                  background: `${cur.color}14`, border: `1px solid ${cur.color}30`,
                  cursor: "pointer",
                  fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 600,
                  color: cur.color,
                  transition: "background 0.12s, border-color 0.12s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = `${cur.color}22`;
                  (e.currentTarget as HTMLButtonElement).style.borderColor = `${cur.color}44`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = `${cur.color}14`;
                  (e.currentTarget as HTMLButtonElement).style.borderColor = `${cur.color}30`;
                }}
              >
                {isLast ? "Finish" : <>Next <ChevronRight size={11} /></>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
