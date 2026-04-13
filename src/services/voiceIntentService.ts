/**
 * voiceIntentService.ts — Thin client for POST /api/v1/voice/intent
 *
 * Returns null in mock mode or on any failure. The hook treats null as
 * "Bedrock unavailable — keep the regex result."
 *
 * Mirrors the irFetch() pattern from irEngine.ts: same base URL resolution,
 * same IS_MOCK guard, same null-on-error contract.
 */

import type { ConversationTurn, FindingContext } from "../hooks/useVoiceIntent";

const IR_API_BASE_URL =
  import.meta.env.VITE_IR_API_BASE ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_GATEWAY_URL ||
  "https://erh3a09d7l.execute-api.us-east-1.amazonaws.com/v1";

const DATA_MODE = (import.meta.env.VITE_DATA_MODE || "live").toLowerCase();
const IS_MOCK = DATA_MODE === "mock";

export interface VoiceIntentResponse {
  intent: string;
  spoken_reply?: string | null;
  args?: Record<string, unknown> | null;
  confidence?: number;
}

export async function fetchVoiceIntent(
  utterance: string,
  contextTurns: ConversationTurn[],
  findingContext: FindingContext | null
): Promise<VoiceIntentResponse | null> {
  if (IS_MOCK) return null;

  try {
    const res = await fetch(`${IR_API_BASE_URL}/voice/intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        utterance,
        context_turns: contextTurns.slice(-3),
        finding_context: findingContext,
      }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as VoiceIntentResponse;
    if (typeof data.intent !== "string") return null;
    return data;
  } catch {
    return null;
  }
}
