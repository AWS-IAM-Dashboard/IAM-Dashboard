import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import {
  downloadFindingsCsv,
  type ExportFindingStatus,
  type ExportSeverity,
} from "../../services/findingsExport";

const EXPORT_SEVERITIES: ExportSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const EXPORT_STATUSES: ExportFindingStatus[] = ["OPEN", "RESOLVED", "SUPPRESSED"];

/**
 * IAM/security findings CSV from the Flask backend — lives under Reports as an export action.
 */
export function FindingsCsvExportCard() {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportSeverities, setExportSeverities] = useState<Set<ExportSeverity>>(
    () => new Set()
  );
  const [exportStatuses, setExportStatuses] = useState<Set<ExportFindingStatus>>(
    () => new Set()
  );
  const [exportStart, setExportStart] = useState("");
  const [exportEnd, setExportEnd] = useState("");

  const toggleExportSeverity = (s: ExportSeverity) => {
    setExportSeverities((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const toggleExportStatus = (s: ExportFindingStatus) => {
    setExportStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const handleConfirmExportCsv = async () => {
    setExportLoading(true);
    try {
      await downloadFindingsCsv({
        severities: Array.from(exportSeverities),
        statuses: Array.from(exportStatuses),
        startDate: exportStart,
        endDate: exportEnd,
      });
      toast.success("CSV export started");
      setExportDialogOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Export failed";
      toast.error("Could not export findings", { description: msg });
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <>
      <div
        style={{
          background: "rgba(15,23,42,0.8)",
          border: "1px solid rgba(0,255,136,0.18)",
          borderRadius: "10px",
          padding: "16px 20px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 220px" }}>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 600,
              color: "rgba(0,255,136,0.75)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: "6px",
            }}
          >
            Data export
          </div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#e2e8f0" }}>
            Findings (CSV)
          </div>
          <p
            style={{
              fontSize: "12px",
              color: "rgba(148,163,184,0.9)",
              marginTop: "6px",
              lineHeight: 1.45,
              maxWidth: "520px",
            }}
          >
            Download IAM/security findings from the Flask API (DynamoDB or PostgreSQL
            fallback). Optional filters for severity, status, and date range.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
          onClick={() => setExportDialogOpen(true)}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle>Export findings (CSV)</DialogTitle>
            <DialogDescription>
              Optional filters. Leave severity and status unchecked to include all values.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Severity</Label>
              <div className="flex flex-wrap gap-3">
                {EXPORT_SEVERITIES.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={exportSeverities.has(s)}
                      onCheckedChange={() => toggleExportSeverity(s)}
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Status</Label>
              <div className="flex flex-wrap gap-3">
                {EXPORT_STATUSES.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={exportStatuses.has(s)}
                      onCheckedChange={() => toggleExportStatus(s)}
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="reports-export-start">Start (optional)</Label>
                <Input
                  id="reports-export-start"
                  type="datetime-local"
                  value={exportStart}
                  onChange={(e) => setExportStart(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="reports-export-end">End (optional)</Label>
                <Input
                  id="reports-export-end"
                  type="datetime-local"
                  value={exportEnd}
                  onChange={(e) => setExportEnd(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setExportDialogOpen(false)}
              disabled={exportLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-primary text-primary-foreground"
              onClick={handleConfirmExportCsv}
              disabled={exportLoading}
            >
              {exportLoading ? "Exporting…" : "Download CSV"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
