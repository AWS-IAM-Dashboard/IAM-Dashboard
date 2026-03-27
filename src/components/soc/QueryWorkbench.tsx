import { useState, useRef, useCallback } from "react";
import { Database, Play, Clock, Search, Loader2, AlertTriangle, BookOpen, History, ChevronDown } from "lucide-react";
import type { SavedQuery, QueryResult } from "./types";
import { MOCK_SAVED_QUERIES } from "./mockData";
import { mono, ls, divider, BackendHandoff, ModuleHeader } from "./shared";

const MOCK_RESULTS: Record<string, QueryResult> = {
  "sq-001": {
    columns: ["@timestamp", "eventName", "sourceIPAddress", "userAgent"],
    rows: [
      ["2026-03-26 21:14:33", "GetCallerIdentity", "45.142.212.100", "aws-sdk-python/1.34.0"],
      ["2026-03-26 20:47:11", "ListBuckets", "203.0.113.44", "aws-cli/2.15.0"],
      ["2026-03-26 19:33:05", "DescribeInstances", "192.168.1.200", "aws-sdk-go/1.48.0"],
    ],
    row_count: 3, scanned_bytes: 52_428_800, execution_ms: 1204, query_id: "qid-mock-001",
  },
  "sq-002": {
    columns: ["sourceIPAddress", "userName", "count()"],
    rows: [
      ["45.142.212.100", "svc-admin", "47"],
      ["185.220.101.58", "alice.chen", "12"],
      ["198.51.100.22", "UNKNOWN", "8"],
    ],
    row_count: 3, scanned_bytes: 104_857_600, execution_ms: 2100, query_id: "qid-mock-002",
  },
  "sq-003": {
    columns: ["userIdentity.arn", "downloads", "bytes_out"],
    rows: [
      ["arn:aws:iam::123456789012:user/svc-data-pipeline", "14820", "47244640256"],
      ["arn:aws:iam::123456789012:assumed-role/DataProcessor/session", "3201", "8589934592"],
      ["arn:aws:iam::123456789012:user/alice.chen", "840", "2147483648"],
    ],
    row_count: 3, scanned_bytes: 2_147_483_648, execution_ms: 4812, query_id: "qid-mock-003",
  },
  "sq-004": {
    columns: ["dstPort", "count()"],
    rows: [["22", "1284"], ["3389", "847"], ["445", "621"], ["5900", "204"], ["23", "178"]],
    row_count: 5, scanned_bytes: 1_073_741_824, execution_ms: 3421, query_id: "qid-mock-004",
  },
  "sq-005": {
    columns: ["@timestamp", "eventName", "userIdentity.arn", "policyName"],
    rows: [
      ["2026-03-26 18:22:10", "AttachRolePolicy", "arn:aws:iam::123456789012:user/alice.chen", "AdministratorAccess"],
      ["2026-03-25 11:44:02", "PutUserPolicy", "arn:aws:iam::123456789012:user/bob.martinez", "InlineDataAccess"],
      ["2026-03-24 09:17:55", "CreatePolicy", "arn:aws:iam::123456789012:assumed-role/DevOps/cicd", "deploy-pipeline-policy"],
    ],
    row_count: 3, scanned_bytes: 83_886_080, execution_ms: 1887, query_id: "qid-mock-005",
  },
};

const SOURCES = ["CloudTrail", "VPC Flow Logs", "GuardDuty", "CloudWatch Logs", "S3 Access Logs"];

function formatBytes(bytes: number) {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${Math.round(bytes / 1e3)} KB`;
}

// Numeric columns right-align and show values in accent color
function isNumericCol(col: string) {
  return col === "count()" || col === "bytes_out" || col === "downloads";
}
function isTimestampCol(col: string) {
  return col === "@timestamp" || col.toLowerCase().includes("time");
}

type HistoryEntry = { id: string; query: string; source: string; ts: string; result: QueryResult; ms: number };

function QueryLibrary({
  queries, activeId, search, onSearch, onLoad,
}: {
  queries: SavedQuery[];
  activeId: string;
  search: string;
  onSearch: (v: string) => void;
  onLoad: (q: SavedQuery) => void;
}) {
  return (
    <>
      <div style={{ padding: "8px 10px", borderBottom: divider }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Search size={10} color="rgba(100,116,139,0.45)" />
          <input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Filter…"
            style={{ background: "none", border: "none", outline: "none", fontSize: 11, color: "#e2e8f0", flex: 1, ...mono }}
          />
        </div>
      </div>
      {queries.map(q => (
        <div
          key={q.id}
          className="soc-row"
          onClick={() => onLoad(q)}
          style={{
            padding: "9px 12px", borderBottom: divider, cursor: "pointer",
            background: activeId === q.id ? "rgba(255,176,0,0.06)" : "transparent",
            borderLeft: `2px solid ${activeId === q.id ? "#ffb000" : "transparent"}`,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0", marginBottom: 3 }}>{q.name}</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
            <span style={{ ...mono, fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "rgba(255,176,0,0.08)", border: "1px solid rgba(255,176,0,0.18)", color: "#ffb000" }}>{q.source}</span>
            {q.last_run && <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.3)" }}>{new Date(q.last_run).toLocaleDateString()}</span>}
          </div>
          {q.description && <div style={{ fontSize: 10, color: "rgba(100,116,139,0.45)", lineHeight: 1.4 }}>{q.description}</div>}
        </div>
      ))}
    </>
  );
}

export function QueryWorkbench() {
  const [activeQuery, setActiveQuery] = useState<SavedQuery>(MOCK_SAVED_QUERIES[0]);
  const [queryText, setQueryText] = useState(MOCK_SAVED_QUERIES[0].query);
  const [source, setSource] = useState(MOCK_SAVED_QUERIES[0].source);
  const [running, setRunning] = useState(false);
  const [runProgress, setRunProgress] = useState(0);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [libraryTab, setLibraryTab] = useState<"saved" | "history">("saved");
  const [search, setSearch] = useState("");
  const [editorFocused, setEditorFocused] = useState(false);
  const runId = useRef(0);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const filtered = MOCK_SAVED_QUERIES.filter(q =>
    !search || q.name.toLowerCase().includes(search.toLowerCase()) || q.source.toLowerCase().includes(search.toLowerCase())
  );

  const lineCount = queryText.split("\n").length;

  function loadQuery(q: SavedQuery) {
    setActiveQuery(q);
    setQueryText(q.query);
    setSource(q.source);
    setResult(null);
    setError(null);
  }

  const runQuery = useCallback(() => {
    if (running || !queryText.trim()) return;
    setRunning(true);
    setResult(null);
    setError(null);
    setRunProgress(5);

    const thisRun = ++runId.current;
    const totalMs = 1800 + Math.random() * 1400;

    // Animate progress bar
    let prog = 5;
    progressRef.current = setInterval(() => {
      prog = Math.min(prog + (Math.random() * 8), 88);
      setRunProgress(prog);
    }, 150);

    setTimeout(() => {
      if (thisRun !== runId.current) return;
      if (progressRef.current) clearInterval(progressRef.current);
      setRunProgress(100);

      setTimeout(() => {
        setRunning(false);
        setRunProgress(0);

        if (Math.random() < 0.08) {
          setError("Query execution failed: ResourceNotFoundException — log group /aws/cloudtrail/acme not found in this region.");
          return;
        }

        const mockResult = MOCK_RESULTS[activeQuery.id] ?? {
          columns: ["@timestamp", "message"],
          rows: [["—", "No results matched the query filter."]],
          row_count: 0, scanned_bytes: 0, execution_ms: Math.round(totalMs), query_id: `qid-custom-${Date.now()}`,
        };
        setResult(mockResult);
        setHistory(prev => [{
          id: `hist-${Date.now()}`,
          query: queryText,
          source,
          ts: new Date().toISOString(),
          result: mockResult,
          ms: mockResult.execution_ms,
        }, ...prev.slice(0, 19)]);
      }, 120);
    }, totalMs);
  }, [running, queryText, activeQuery.id, source]);

  // Ctrl+Enter to run
  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      runQuery();
    }
  }

  return (
    <div>
      <ModuleHeader
        icon={<Database size={16} color="#ffb000" />}
        title="Query Workbench"
        subtitle="CloudWatch Insights · Athena queries · Ctrl+Enter to run"
      />

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 12, alignItems: "start" }}>
        {/* Library sidebar */}
        <div style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden", background: "rgba(15,23,42,0.8)" }}>
          <div style={{ display: "flex", borderBottom: divider }}>
            {([
              ["saved", <BookOpen size={10} />, "Saved"],
              ["history", <History size={10} />, "History"],
            ] as [typeof libraryTab, React.ReactNode, string][]).map(([id, icon, label]) => (
              <button
                key={id}
                onClick={() => setLibraryTab(id)}
                className="soc-btn"
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  padding: "8px 0", border: "none", cursor: "pointer",
                  background: "transparent",
                  color: libraryTab === id ? "#ffb000" : "rgba(100,116,139,0.4)",
                  ...mono, fontSize: 10, fontWeight: 700,
                  borderBottom: `2px solid ${libraryTab === id ? "#ffb000" : "transparent"}`,
                  transition: "all 0.12s",
                }}
              >
                {icon}{label}
              </button>
            ))}
          </div>

          {libraryTab === "saved" && (
            <QueryLibrary
              queries={filtered}
              activeId={activeQuery.id}
              search={search}
              onSearch={setSearch}
              onLoad={loadQuery}
            />
          )}

          {libraryTab === "history" && (
            history.length === 0 ? (
              <div style={{ padding: "16px 12px" }}>
                <p style={{ fontSize: 11, color: "rgba(100,116,139,0.35)", margin: 0 }}>No queries run this session.</p>
              </div>
            ) : (
              history.map(h => (
                <div
                  key={h.id}
                  className="soc-row"
                  onClick={() => { setQueryText(h.query); setSource(h.source); setResult(h.result); setError(null); }}
                  style={{ padding: "9px 12px", borderBottom: divider, cursor: "pointer" }}
                >
                  <div style={{ display: "flex", gap: 6, marginBottom: 3 }}>
                    <span style={{ ...mono, fontSize: 9, color: "#ffb000" }}>{h.source}</span>
                    <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.35)" }}>{h.ms}ms</span>
                  </div>
                  <pre style={{ ...mono, fontSize: 9, color: "rgba(148,163,184,0.55)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{h.query.trim()}</pre>
                  <div style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.28)", marginTop: 3 }}>{new Date(h.ts).toLocaleTimeString()}</div>
                </div>
              ))
            )
          )}
        </div>

        {/* Editor + results column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Editor panel — terminal feel */}
          <div style={{
            borderRadius: 10, overflow: "hidden",
            border: `1px solid ${editorFocused ? "rgba(255,176,0,0.25)" : "rgba(255,255,255,0.08)"}`,
            transition: "border-color 0.15s",
            background: "rgba(1,4,12,0.92)",
          }}>
            {/* Editor toolbar */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "7px 12px",
              background: "rgba(255,255,255,0.025)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
              {/* Source selector */}
              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.45)" }}>source</span>
                <div style={{ position: "relative" }}>
                  <select
                    value={source}
                    onChange={e => setSource(e.target.value)}
                    style={{
                      ...mono, fontSize: 10,
                      background: "rgba(255,176,0,0.06)",
                      border: "1px solid rgba(255,176,0,0.2)",
                      borderRadius: 4, padding: "2px 22px 2px 7px",
                      color: "#ffb000", outline: "none", cursor: "pointer",
                      appearance: "none", WebkitAppearance: "none",
                    }}
                  >
                    {SOURCES.map(s => <option key={s} value={s} style={{ background: "#010814" }}>{s}</option>)}
                  </select>
                  <ChevronDown size={9} color="#ffb000" style={{ position: "absolute", right: 5, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.6 }} />
                </div>
              </div>

              <div style={{ flex: 1 }} />

              {/* Keyboard shortcut hint */}
              <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.28)" }}>⌘↵ run</span>

              {/* Run button */}
              <button
                onClick={runQuery}
                disabled={running || !queryText.trim()}
                className="soc-btn"
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "4px 12px", borderRadius: 5,
                  background: running ? "rgba(255,176,0,0.06)" : "rgba(255,176,0,0.1)",
                  border: `1px solid ${running ? "rgba(255,176,0,0.2)" : "rgba(255,176,0,0.28)"}`,
                  color: "#ffb000", ...mono, fontSize: 10, fontWeight: 700,
                  cursor: running || !queryText.trim() ? "not-allowed" : "pointer",
                  opacity: !queryText.trim() ? 0.35 : 1, transition: "opacity 0.1s",
                }}
              >
                {running
                  ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
                  : <Play size={11} fill="#ffb000" />
                }
                {running ? "Running" : "Run"}
              </button>
            </div>

            {/* Editor body: line numbers + textarea */}
            <div style={{ display: "flex", position: "relative" }}>
              {/* Gutter */}
              <div style={{
                width: 38, flexShrink: 0,
                background: "rgba(0,0,0,0.25)",
                borderRight: "1px solid rgba(255,255,255,0.04)",
                padding: "12px 0",
                userSelect: "none",
              }}>
                {Array.from({ length: lineCount }, (_, i) => (
                  <div key={i} style={{ ...mono, fontSize: 11, lineHeight: "1.7", textAlign: "right", paddingRight: 8, color: "rgba(100,116,139,0.22)" }}>
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* The editor */}
              <textarea
                value={queryText}
                onChange={e => setQueryText(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setEditorFocused(true)}
                onBlur={() => setEditorFocused(false)}
                spellCheck={false}
                rows={Math.max(lineCount, 6)}
                style={{
                  flex: 1, display: "block",
                  background: "transparent",
                  border: "none", outline: "none",
                  resize: "none",
                  padding: "12px 16px",
                  color: "#c8d3f5",
                  ...mono, fontSize: 12, lineHeight: "1.7",
                  boxSizing: "border-box",
                  caretColor: "#ffb000",
                  minHeight: 120,
                }}
              />
            </div>

            {/* Status bar */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "4px 12px",
              background: "rgba(0,0,0,0.3)",
              borderTop: "1px solid rgba(255,255,255,0.04)",
              height: 22,
              position: "relative", overflow: "hidden",
            }}>
              {/* Progress fill */}
              {running && (
                <div style={{
                  position: "absolute", left: 0, top: 0, bottom: 0,
                  width: `${runProgress}%`,
                  background: "linear-gradient(90deg, rgba(255,176,0,0.08), rgba(255,176,0,0.14))",
                  transition: "width 0.15s linear",
                }} />
              )}
              <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.3)", zIndex: 1 }}>
                {lineCount} line{lineCount !== 1 ? "s" : ""}
              </span>
              <span style={{ flex: 1 }} />
              {running && (
                <span style={{ ...mono, fontSize: 9, color: "#ffb000", zIndex: 1, animation: "ir-pulse 1.2s infinite" }}>
                  executing…
                </span>
              )}
              {result && !running && (
                <span style={{ ...mono, fontSize: 9, color: "#00ff88", zIndex: 1 }}>
                  {result.row_count} rows · {result.execution_ms}ms · {formatBytes(result.scanned_bytes)}
                </span>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(255,0,64,0.05)", border: "1px solid rgba(255,0,64,0.18)", display: "flex", alignItems: "flex-start", gap: 10 }}>
              <AlertTriangle size={13} color="#ff0040" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ ...mono, fontSize: 11, color: "rgba(255,80,80,0.85)", margin: 0, lineHeight: 1.5 }}>{error}</p>
            </div>
          )}

          {/* Results */}
          {result && !running && (
            <div style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden", background: "rgba(15,23,42,0.85)" }}>
              <div style={{
                padding: "7px 14px", borderBottom: divider,
                background: "rgba(255,255,255,0.02)",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff88" }} />
                  <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: "#00ff88" }}>{result.row_count} rows</span>
                </div>
                <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.4)" }}>
                  <Clock size={9} style={{ display: "inline", marginRight: 3, verticalAlign: "middle" }} />
                  {result.execution_ms}ms
                </span>
                <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.4)" }}>{formatBytes(result.scanned_bytes)} scanned</span>
                <span style={{ ...mono, fontSize: 9, color: "rgba(100,116,139,0.25)" }}>{result.query_id}</span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.015)" }}>
                      {result.columns.map(col => (
                        <th key={col} style={{
                          ...ls, fontSize: 9,
                          padding: "8px 12px",
                          textAlign: isNumericCol(col) ? "right" : "left",
                          borderBottom: divider, whiteSpace: "nowrap",
                        }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, ri) => (
                      <tr
                        key={ri}
                        className="soc-row"
                        style={{ background: ri % 2 === 1 ? "rgba(255,255,255,0.01)" : "transparent" }}
                      >
                        {row.map((cell, ci) => {
                          const col = result.columns[ci];
                          const isTs = isTimestampCol(col);
                          const isNum = isNumericCol(col);
                          const isArn = cell.startsWith("arn:");
                          return (
                            <td key={ci} style={{
                              ...mono, fontSize: 11,
                              padding: "8px 12px",
                              borderBottom: divider,
                              textAlign: isNum ? "right" : "left",
                              color: isTs ? "rgba(100,116,139,0.5)" : isNum ? "#ffb000" : isArn ? "rgba(148,163,184,0.6)" : "#94a3b8",
                              whiteSpace: isArn ? "nowrap" : "normal",
                              maxWidth: isArn ? 340 : undefined,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}>
                              {isNum ? Number(cell).toLocaleString() : cell}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!result && !error && !running && (
            <div style={{ padding: "20px 0 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <Database size={20} color="rgba(100,116,139,0.12)" />
              <p style={{ fontSize: 11, color: "rgba(100,116,139,0.3)", margin: 0, ...mono }}>
                Select a query from the library or write your own · Ctrl+Enter to run
              </p>
            </div>
          )}
        </div>
      </div>

      <BackendHandoff endpoints={[
        { method: "POST", path: "/api/soc/query/run", description: "Execute CloudWatch Insights or Athena query — returns async job ID" },
        { method: "GET", path: "/api/soc/query/:job_id", description: "Poll execution status and retrieve paginated results" },
        { method: "GET", path: "/api/soc/query/saved", description: "Fetch analyst-saved queries from DynamoDB" },
        { method: "POST", path: "/api/soc/query/saved", description: "Save query to shared library" },
        { method: "DELETE", path: "/api/soc/query/saved/:id", description: "Remove saved query" },
      ]} />
    </div>
  );
}
