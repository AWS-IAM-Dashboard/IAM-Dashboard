/**
 * useVoiceIntent — Two-tier voice intent resolution
 *
 * Tier 1: regex fast-path via matchIntent() — synchronous, zero network.
 * Tier 2: Bedrock fallback via fetchVoiceIntent() — async, only on "unknown".
 *
 * The 14 regex patterns previously lived in VoiceIRAgent.tsx. Moving them here
 * makes them independently testable without mounting React.
 *
 * isThinking: true only during a live Bedrock call. Never true for regex-resolved
 * intents or in mock mode (fetchVoiceIntent returns null immediately).
 */

import { useState, useCallback } from "react";
import { fetchVoiceIntent } from "../services/voiceIntentService";

// ── Public types ──────────────────────────────────────────────────────────────

export interface ResolvedIntent {
  /** One of the 14 named intents or "unknown" */
  intent: string;
  /**
   * Present when source === "bedrock". Use this for TTS instead of
   * buildResponse().spokenText so Bedrock's context-aware reply is spoken.
   */
  spokenReply?: string;
  /** Structured args extracted by Bedrock (e.g. { resource: "i-0abc" }). */
  args?: Record<string, unknown>;
  /** Bedrock model confidence 0–1. Informational only. */
  confidence?: number;
  /** "regex" = resolved synchronously; "bedrock" = Bedrock resolved */
  source: "regex" | "bedrock";
}

export interface ConversationTurn {
  role: "user" | "agent";
  text: string;
}

export interface FindingContext {
  id?: string;
  severity?: string;
  finding_type?: string;
  resource_name?: string;
  service?: string;
}

// ── Regex intent matcher ──────────────────────────────────────────────────────

function matchIntent(input: string): string {
  const t = input.toLowerCase().trim();
  // SLA must be tested before briefing — "sla status" would match the (now-removed)
  // bare "status" token in the old briefing regex, returning "briefing" instead.
  if (/\b(sla|breach|breached|overdue)\b/.test(t)) return "sla";
  if (/\b(brief|briefing|situation|sitrep|what('s| is) (going on|happening|the situation))\b/.test(t)) return "briefing";
  if (/\b(critical|crit findings?|show critical|critical alerts?)\b/.test(t)) return "critical";
  if (/\b(threat level|threat assessment|current threat)\b/.test(t)) return "threat";
  if (/\b(latest|new findings?|recent|last scan)\b/.test(t)) return "latest";
  if (/\b(show findings?|list findings?|findings? list|all findings?)\b/.test(t)) return "show_findings";
  if (/\b(compliance|score|posture|frameworks?)\b/.test(t)) return "compliance";
  if (/\b(scan|run scan|start scan)\b/.test(t)) return "scan";
  if (/\b(help|commands?|what can you)\b/.test(t)) return "help";
  if (/\b(high (risk|findings?|severity)|high risk)\b/.test(t)) return "high";
  if (/\b(isolate|contain|lock down|quarantine)\b/.test(t)) return "isolate";
  if (/\b(revoke|delete key|remove key|kill key)\b/.test(t)) return "revoke";
  if (/\b(disable key|deactivate key|suspend key)\b/.test(t)) return "disable_key";
  if (/\b(go to|navigate|open|take me)\b/.test(t)) return "navigate";
  return "unknown";
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useVoiceIntent() {
  const [isThinking, setIsThinking] = useState(false);

  const resolveIntent = useCallback(
    async (
      utterance: string,
      contextTurns: ConversationTurn[] = [],
      findingContext: FindingContext | null = null
    ): Promise<ResolvedIntent> => {
      // Tier 1 — synchronous fast-path
      const regexResult = matchIntent(utterance);
      if (regexResult !== "unknown") {
        return { intent: regexResult, source: "regex" };
      }

      // Tier 2 — Bedrock fallback
      setIsThinking(true);
      try {
        const result = await fetchVoiceIntent(utterance, contextTurns, findingContext);
        if (!result) {
          // mock mode or network failure — keep "unknown" with no spinner shown
          return { intent: "unknown", source: "regex" };
        }
        return {
          intent:      result.intent,
          spokenReply: result.spoken_reply ?? undefined,
          args:        result.args ?? undefined,
          confidence:  result.confidence,
          source:      "bedrock",
        };
      } catch {
        return { intent: "unknown", source: "regex" };
      } finally {
        setIsThinking(false);
      }
    },
    [] // stable — fetchVoiceIntent is a module-level import
  );

  return { resolveIntent, isThinking };
}
