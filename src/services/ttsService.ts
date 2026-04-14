/**
 * ttsService.ts — AWS Polly Neural TTS client with Web Speech API fallback
 *
 * Usage:
 *   const done = await pollySpeak("Two critical findings require action.");
 *   // done === true  → Polly audio played to completion
 *   // done === false → Polly unavailable; caller should use browser TTS
 *
 * The service returns false immediately in mock mode so VoiceIRAgent can
 * fall through to speechSynthesis without a round-trip.
 */

const IR_BASE =
  import.meta.env.VITE_IR_API_BASE ||
  import.meta.env.VITE_API_URL ||
  "";

const IS_MOCK = (import.meta.env.VITE_DATA_MODE || "live").toLowerCase() === "mock";

/** Default voice for the SOC context — Matthew is AWS Polly Neural US English Male */
const DEFAULT_VOICE = "Matthew";

/**
 * Synthesize `text` via AWS Polly Neural TTS (proxied through Flask).
 * Returns a Promise that resolves to `true` when the audio finishes playing,
 * or `false` if Polly is unavailable (mock mode, network error, non-2xx).
 * The caller is responsible for triggering a browser TTS fallback on false.
 */
export async function pollySpeak(
  text: string,
  voice = DEFAULT_VOICE
): Promise<boolean> {
  if (IS_MOCK) return false;
  if (!text.trim()) return false;

  try {
    // VITE_IR_API_BASE is documented as already ending in /api/v1 (e.g.
    // http://localhost:3001/api/v1), so appending the full path again would
    // produce a double-segment URL. Strip the suffix if present.
    const ttsBase = IR_BASE.endsWith("/api/v1") ? IR_BASE : `${IR_BASE}/api/v1`;
    const resp = await fetch(`${ttsBase}/tts/synthesize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 3000), voice, engine: "neural" }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!resp.ok) return false;

    const blob = await resp.blob();
    if (!blob.size) return false;

    const url = URL.createObjectURL(blob);

    return new Promise<boolean>((resolve) => {
      const audio = new Audio(url);

      const cleanup = (result: boolean) => {
        URL.revokeObjectURL(url);
        resolve(result);
      };

      audio.onended = () => cleanup(true);
      audio.onerror = () => cleanup(false);

      // Some browsers require a user gesture for audio.play()
      audio.play().catch(() => cleanup(false));
    });
  } catch {
    return false;
  }
}
