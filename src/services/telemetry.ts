import { getApiBaseUrl, type ScannerType } from "./api";

export type TelemetryMetricName =
  | "frontend_page_load_seconds"
  | "frontend_scans_triggered_total"
  | "frontend_js_errors_total";

interface TelemetryEvent {
  metric: TelemetryMetricName;
  labels: Record<string, string>;
  value?: number;
  timestamp?: string;
}

type KnownPage = "landing" | "login" | "dashboard";

const PAGE_BY_PATH: Record<string, KnownPage> = {
  "/": "landing",
  "/login": "login",
  "/app": "dashboard",
};

const PROD_HOSTS = new Set(["iam-dashboard.com", "www.iam-dashboard.com"]);

function normalizePage(pathname: string): KnownPage | "unknown" {
  return PAGE_BY_PATH[pathname] ?? "unknown";
}

function environmentLabel(): "dev" | "prod" {
  if (import.meta.env.PROD || PROD_HOSTS.has(window.location.hostname)) {
    return "prod";
  }
  return "dev";
}

export function currentTelemetryPage(): KnownPage | "unknown" {
  return normalizePage(window.location.pathname);
}

export async function sendTelemetryEvent(event: TelemetryEvent): Promise<void> {
  try {
    await fetch(`${getApiBaseUrl()}/telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        ...event,
        timestamp: event.timestamp ?? new Date().toISOString(),
      }),
    });
  } catch {
    // Never disrupt UX for telemetry failures.
  }
}

export function emitPageLoadMetric(page: KnownPage): void {
  const loadSeconds = performance.now() / 1000;

  void sendTelemetryEvent({
    metric: "frontend_page_load_seconds",
    labels: { page },
    value: loadSeconds,
  });
}

export function emitScanTriggeredMetric(scannerType: ScannerType): void {
  void sendTelemetryEvent({
    metric: "frontend_scans_triggered_total",
    labels: {
      scanner_type: scannerType,
      environment: environmentLabel(),
    },
    value: 1,
  });
}

export function emitJsErrorMetric(
  errorType: "runtime" | "promise_rejection" | "render_error" | "network",
): void {
  const page = currentTelemetryPage();
  void sendTelemetryEvent({
    metric: "frontend_js_errors_total",
    labels: { page, error_type: errorType },
    value: 1,
  });
}
