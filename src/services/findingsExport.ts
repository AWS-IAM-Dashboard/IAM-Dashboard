/**
 * CSV export against the Flask backend (/api/findings/export/csv).
 *
 * Base URL resolution:
 * 1. `VITE_FLASK_API_URL` when set (e.g. `http://localhost:5001` for Docker host → Flask).
 * 2. In Vite dev (`import.meta.env.DEV`), empty string → same-origin requests so
 *    `vite.config` can proxy `/api/findings` to Flask (avoids wrong port / 404).
 * 3. Otherwise `http://localhost:5001` (matches docker-compose `app` port publish).
 */
function resolveFlaskApiBase(): string {
  const raw = (import.meta.env.VITE_FLASK_API_URL as string | undefined)?.replace(/\/$/, "");
  if (raw && raw.trim()) {
    return raw.trim();
  }
  if (import.meta.env.DEV) {
    return "";
  }
  return "http://localhost:5001";
}

export const FLASK_API_BASE = resolveFlaskApiBase();

export type ExportSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ExportFindingStatus = "OPEN" | "RESOLVED" | "SUPPRESSED";

export interface FindingsExportFilters {
  severities: ExportSeverity[];
  statuses: ExportFindingStatus[];
  startDate: string;
  endDate: string;
}

export function buildFindingsExportQueryString(filters: FindingsExportFilters): string {
  const p = new URLSearchParams();
  for (const s of filters.severities) {
    p.append("severity", s);
  }
  for (const st of filters.statuses) {
    p.append("status", st);
  }
  if (filters.startDate.trim()) {
    p.set("start_date", new Date(filters.startDate).toISOString());
  }
  if (filters.endDate.trim()) {
    p.set("end_date", new Date(filters.endDate).toISOString());
  }
  return p.toString();
}

/**
 * Uses fetch + Blob. When the backend has JWT_SECRET set, send a Bearer token from
 * localStorage (`access_token` or `jwt`) only — never from a VITE_* env var (those ship in the bundle).
 */
export async function downloadFindingsCsv(filters: FindingsExportFilters): Promise<void> {
  const qs = buildFindingsExportQueryString(filters);
  const url = `${FLASK_API_BASE}/api/findings/export/csv?${qs}`;
  const headers: HeadersInit = {};
  const token =
    (typeof localStorage !== "undefined" && localStorage.getItem("access_token")) ||
    (typeof localStorage !== "undefined" && localStorage.getItem("jwt"));
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    let detail = text?.trim() || "";
    try {
      const j = JSON.parse(text) as { message?: string; error?: string };
      if (j.message) {
        detail = j.message;
      } else if (j.error) {
        detail = j.error;
      }
    } catch {
      /* plain-text error body */
    }
    throw new Error(detail || `Export failed (${res.status})`);
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition");
  let filename = "iam_findings.csv";
  const m = cd?.match(/filename="([^"]+)"/);
  if (m?.[1]) {
    filename = m[1];
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
