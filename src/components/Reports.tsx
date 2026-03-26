import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { FileText, Download, Calendar, Filter, Search, Eye, Plus } from "lucide-react";
import { exportScanResultToPDF, exportScanResultToCSV, exportScanResultToJSON, type ScanResultData } from "../services/pdfExport";
import { toast } from "sonner";
import { useScanResults } from "../context/ScanResultsContext";
import type { ReportRecord } from "../types/report";

const REPORT_TYPE_TABS = [
  {
    value: "security-hub",
    label: "Security Hub",
    title: "Security Hub Report",
    description: "Summarises findings, control status, and automated actions from AWS Security Hub.",
  },
  {
    value: "guardduty",
    label: "GuardDuty",
    title: "GuardDuty Report",
    description: "Highlights anomaly detections, IP reputation events, and resource compromises from GuardDuty.",
  },
  {
    value: "config",
    label: "Config",
    title: "Config Compliance Report",
    description: "Tracks configuration drift, compliance packs, and remediation timelines captured by AWS Config.",
  },
  {
    value: "inspector",
    label: "Inspector",
    title: "Inspector Vulnerability Report",
    description: "Provides CVE coverage, package findings, and remediation progress from AWS Inspector scans.",
  },
  {
    value: "macie",
    label: "Macie",
    title: "Macie Data Protection Report",
    description: "Details sensitive data discovery, classification results, and access anomalies surfaced by Macie.",
  },
  {
    value: "iam-security",
    label: "IAM & Access",
    title: "IAM & Access Control Report",
    description: "Reviews user permissions, role changes, and high-risk policies detected across IAM resources.",
  },
  {
    value: "ec2-security",
    label: "EC2 Compute",
    title: "EC2 & Compute Report",
    description: "Analyses instance posture, patch status, exposed services, and runtime events for compute resources.",
  },
  {
    value: "s3-security",
    label: "S3 Storage",
    title: "S3 Storage Report",
    description: "Surfaces bucket misconfigurations, access issues, and sensitive data exposures within S3.",
  },
  {
    value: "alerts",
    label: "Security Alerts",
    title: "Security Alerts Digest",
    description: "Aggregates alert spikes, suppressed signals, and rule coverage across monitoring channels.",
  },
] as const;

const DEFAULT_REPORT_TYPE = REPORT_TYPE_TABS[0].value;

interface ReportsProps {
  reports: ReportRecord[];
}

export function Reports({ reports }: ReportsProps) {
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [reportType, setReportType] = useState<string>(DEFAULT_REPORT_TYPE);
  const [reportName, setReportName] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportFormats, setExportFormats] = useState({
    pdf: true,
    csv: false,
    json: false
  });
  const { getScanResult, getAllScanResults } = useScanResults();

  const handleFormatChange = (format: 'pdf' | 'csv' | 'json') => {
    setExportFormats(prev => ({ ...prev, [format]: !prev[format] }));
  };

  const selectedReport = REPORT_TYPE_TABS.find((tab) => tab.value === reportType) ?? REPORT_TYPE_TABS[0];

  /**
   * Extract findings from scan result, trying multiple locations
   */
  const extractFindingsFromResult = (scanResult: any): any[] => {
    // Try direct findings
    if (scanResult.findings && Array.isArray(scanResult.findings) && scanResult.findings.length > 0) {
      return scanResult.findings;
    }
    
    // Try in results object
    if (scanResult.results?.findings && Array.isArray(scanResult.results.findings) && scanResult.results.findings.length > 0) {
      return scanResult.results.findings;
    }
    
    // Try nested in various scanner-specific locations
    const nestedFindings: any[] = [];
    
    if (scanResult.results?.iam_findings) nestedFindings.push(...(Array.isArray(scanResult.results.iam_findings) ? scanResult.results.iam_findings : []));
    if (scanResult.results?.security_hub_findings) nestedFindings.push(...(Array.isArray(scanResult.results.security_hub_findings) ? scanResult.results.security_hub_findings : []));
    if (scanResult.results?.guardduty_findings) nestedFindings.push(...(Array.isArray(scanResult.results.guardduty_findings) ? scanResult.results.guardduty_findings : []));
    if (scanResult.results?.config_findings) nestedFindings.push(...(Array.isArray(scanResult.results.config_findings) ? scanResult.results.config_findings : []));
    if (scanResult.results?.inspector_findings) nestedFindings.push(...(Array.isArray(scanResult.results.inspector_findings) ? scanResult.results.inspector_findings : []));
    if (scanResult.results?.macie_findings) nestedFindings.push(...(Array.isArray(scanResult.results.macie_findings) ? scanResult.results.macie_findings : []));
    
    if (nestedFindings.length > 0) {
      return nestedFindings;
    }
    
    return scanResult.findings || [];
  };

  /**
   * Generate Security Summary Report - Complete overview of all security findings
   */
  const generateSecuritySummary = () => {
    setIsGenerating(true);
    const allScans = getAllScanResults();
    
    if (allScans.length === 0) {
      toast.warning('No scan data available', {
        description: 'Please run scans first to generate a security summary report'
      });
      setIsGenerating(false);
      return;
    }

    // Combine all scan results
    const combinedSummary = {
      critical_findings: allScans.reduce((sum, s) => sum + (s.scan_summary?.critical_findings || 0), 0),
      high_findings: allScans.reduce((sum, s) => sum + (s.scan_summary?.high_findings || 0), 0),
      medium_findings: allScans.reduce((sum, s) => sum + (s.scan_summary?.medium_findings || 0), 0),
      low_findings: allScans.reduce((sum, s) => sum + (s.scan_summary?.low_findings || 0), 0),
      users: allScans.find(s => s.scanner_type === 'iam')?.scan_summary?.users || 0,
      roles: allScans.find(s => s.scanner_type === 'iam')?.scan_summary?.roles || 0,
      policies: allScans.find(s => s.scanner_type === 'iam')?.scan_summary?.policies || 0,
      groups: allScans.find(s => s.scanner_type === 'iam')?.scan_summary?.groups || 0
    };
    
    const allFindings = allScans.flatMap(s => s.findings || []);
    
    const scanData: ScanResultData = {
      scan_id: `security-summary-${Date.now()}`,
      scanner_type: 'comprehensive',
      region: allScans[0]?.region || 'us-east-1',
      status: 'completed',
      timestamp: new Date().toISOString(),
      results: { scans: allScans },
      scan_summary: combinedSummary,
      findings: allFindings
    };

    try {
      exportScanResultToPDF(scanData, 'Security Summary Report');
      toast.success('Security Summary Report generated', {
        description: `Combined ${allScans.length} scan results with ${allFindings.length} total findings`
      });
    } catch (error) {
      toast.error('Failed to generate report', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Generate Threat Intelligence Report - Detailed analysis of detected threats
   */
  const generateThreatIntelligence = () => {
    setIsGenerating(true);
    const allScans = getAllScanResults();
    
    if (allScans.length === 0) {
      toast.warning('No scan data available', {
        description: 'Please run scans first to generate a threat intelligence report'
      });
      setIsGenerating(false);
      return;
    }

    // Focus on critical and high severity findings
    const allFindings = allScans.flatMap(s => s.findings || []);
    const threatFindings = allFindings.filter((f: any) => {
      const severity = (f.severity || '').toLowerCase();
      return severity === 'critical' || severity === 'high';
    });

    // Group threats by type
    const threatsByType: Record<string, any[]> = {};
    threatFindings.forEach((finding: any) => {
      const type = finding.type || finding.finding_type || finding.resource_type || 'Unknown';
      if (!threatsByType[type]) {
        threatsByType[type] = [];
      }
      threatsByType[type].push(finding);
    });

    const threatSummary = {
      critical_findings: allFindings.filter((f: any) => (f.severity || '').toLowerCase() === 'critical').length,
      high_findings: allFindings.filter((f: any) => (f.severity || '').toLowerCase() === 'high').length,
      medium_findings: 0,
      low_findings: 0,
      total_threats: threatFindings.length,
      threat_types: Object.keys(threatsByType).length
    };
    
    const scanData: ScanResultData = {
      scan_id: `threat-intelligence-${Date.now()}`,
      scanner_type: 'threat-intelligence',
      region: allScans[0]?.region || 'us-east-1',
      status: 'completed',
      timestamp: new Date().toISOString(),
      results: { 
        threats_by_type: threatsByType,
        threat_analysis: {
          total_threats: threatFindings.length,
          critical_count: threatSummary.critical_findings,
          high_count: threatSummary.high_findings,
          threat_types: Object.keys(threatsByType)
        }
      },
      scan_summary: threatSummary,
      findings: threatFindings
    };

    try {
      exportScanResultToPDF(scanData, 'Threat Intelligence Report');
      toast.success('Threat Intelligence Report generated', {
        description: `Analyzed ${threatFindings.length} critical/high threats across ${Object.keys(threatsByType).length} threat types`
      });
    } catch (error) {
      toast.error('Failed to generate report', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Generate Executive Summary Report - High-level summary for management
   */
  const generateExecutiveSummary = () => {
    setIsGenerating(true);
    const allScans = getAllScanResults();
    
    if (allScans.length === 0) {
      toast.warning('No scan data available', {
        description: 'Please run scans first to generate an executive summary report'
      });
      setIsGenerating(false);
      return;
    }

    // Aggregate high-level metrics
    const totalCritical = allScans.reduce((sum, s) => sum + (s.scan_summary?.critical_findings || 0), 0);
    const totalHigh = allScans.reduce((sum, s) => sum + (s.scan_summary?.high_findings || 0), 0);
    const totalMedium = allScans.reduce((sum, s) => sum + (s.scan_summary?.medium_findings || 0), 0);
    const totalLow = allScans.reduce((sum, s) => sum + (s.scan_summary?.low_findings || 0), 0);
    const totalFindings = totalCritical + totalHigh + totalMedium + totalLow;
    
    // Calculate compliance percentage (green if no critical/high, yellow if some, red if many)
    const compliancePercentage = totalFindings === 0 ? 100 : 
      Math.max(0, Math.round(100 - ((totalCritical * 10 + totalHigh * 5 + totalMedium * 2 + totalLow) / totalFindings * 100)));

    // Get top 5 critical findings for executive summary
    const allFindings = allScans.flatMap(s => s.findings || []);
    const criticalFindings = allFindings
      .filter((f: any) => (f.severity || '').toLowerCase() === 'critical')
      .slice(0, 5);

    const executiveSummary = {
      critical_findings: totalCritical,
      high_findings: totalHigh,
      medium_findings: totalMedium,
      low_findings: totalLow,
      total_findings: totalFindings,
      compliance_percentage: compliancePercentage,
      scans_analyzed: allScans.length,
      top_critical_risks: criticalFindings.length
    };
    
    const scanData: ScanResultData = {
      scan_id: `executive-summary-${Date.now()}`,
      scanner_type: 'executive-summary',
      region: allScans[0]?.region || 'us-east-1',
      status: 'completed',
      timestamp: new Date().toISOString(),
      results: { 
        executive_metrics: executiveSummary,
        top_critical_findings: criticalFindings,
        scan_summary: {
          total_scans: allScans.length,
          scanners_used: [...new Set(allScans.map(s => s.scanner_type))],
          compliance_score: compliancePercentage
        }
      },
      scan_summary: executiveSummary,
      findings: criticalFindings // Only show top critical findings in executive summary
    };

    try {
      exportScanResultToPDF(scanData, 'Executive Summary Report');
      toast.success('Executive Summary Report generated', {
        description: `Compliance: ${compliancePercentage}% | ${totalFindings} total findings across ${allScans.length} scans`
      });
    } catch (error) {
      toast.error('Failed to generate report', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateReport = () => {
    if (!reportType) {
      toast.error('Please select a report type');
      return;
    }

    // Use selected report title as default name if not provided
    const finalReportName = reportName || selectedReport.title;

    setIsGenerating(true);

    // Map report type to scanner type
    const scannerTypeMap: Record<string, string> = {
      'comprehensive': 'full',
      'memory-scan': 'memory', // Not a scanner, but keep for compatibility
      'hidden-process': 'process', // Not a scanner, but keep for compatibility
      'dll-analysis': 'dll', // Not a scanner, but keep for compatibility
      'incident': 'full',
      'custom': reportType, // Use as-is
      'iam': 'iam',
      'iam-security': 'iam',
      'ec2': 'ec2',
      'ec2-security': 'ec2',
      's3': 's3',
      's3-security': 's3',
      'security-hub': 'security-hub',
      'guardduty': 'guardduty',
      'config': 'config',
      'inspector': 'inspector',
      'macie': 'macie'
    };
    
    const scannerType = scannerTypeMap[reportType] || reportType;
    
    let scanData: ScanResultData;
    
    // For comprehensive reports, combine all available scan results
    if (reportType === 'comprehensive' || reportType === 'incident') {
      const allScans = getAllScanResults();
      if (allScans.length > 0) {
        // Combine all scan results into one comprehensive report
        const combinedSummary = {
          critical_findings: allScans.reduce((sum, s) => sum + (s.scan_summary?.critical_findings || 0), 0),
          high_findings: allScans.reduce((sum, s) => sum + (s.scan_summary?.high_findings || 0), 0),
          medium_findings: allScans.reduce((sum, s) => sum + (s.scan_summary?.medium_findings || 0), 0),
          low_findings: allScans.reduce((sum, s) => sum + (s.scan_summary?.low_findings || 0), 0),
          users: allScans.find(s => s.scanner_type === 'iam')?.scan_summary?.users || 0,
          roles: allScans.find(s => s.scanner_type === 'iam')?.scan_summary?.roles || 0,
          policies: allScans.find(s => s.scanner_type === 'iam')?.scan_summary?.policies || 0,
          groups: allScans.find(s => s.scanner_type === 'iam')?.scan_summary?.groups || 0
        };
        
        const allFindings = allScans.flatMap(s => s.findings || []);
        
        scanData = {
          scan_id: `comprehensive-${Date.now()}`,
          scanner_type: 'comprehensive',
          region: allScans[0]?.region || 'us-east-1',
          status: 'completed',
          timestamp: new Date().toISOString(),
          results: { scans: allScans },
          scan_summary: combinedSummary,
          findings: allFindings
        };
        
        toast.info('Comprehensive report generated', {
          description: `Combined ${allScans.length} scan results`
        });
      } else {
        // No scans available, use mock data
        scanData = {
          scan_id: `report-${Date.now()}`,
          scanner_type: reportType,
          region: 'us-east-1',
          status: 'completed',
          timestamp: new Date().toISOString(),
          scan_summary: {
            critical_findings: 5,
            high_findings: 12,
            medium_findings: 8,
            low_findings: 3
          },
          findings: []
        };
        toast.warning('No scan data found', {
          description: 'Run scans first to generate comprehensive report with real data'
        });
      }
    } else {
      // Get real scan result from context, or use mock data as fallback
      const realScanResult = getScanResult(scannerType);
      let scanDataSingle: ScanResultData;

      if (realScanResult) {
        // Extract findings comprehensively
        const extractedFindings = extractFindingsFromResult(realScanResult);
        
        // Use real scan result
        scanDataSingle = {
          scan_id: realScanResult.scan_id,
          scanner_type: realScanResult.scanner_type,
          region: realScanResult.region,
          status: realScanResult.status,
          timestamp: realScanResult.timestamp,
          results: realScanResult.results,
          scan_summary: realScanResult.scan_summary,
          findings: extractedFindings.length > 0 ? extractedFindings : realScanResult.findings || []
        };
        toast.info('Using real scan data', {
          description: `Report generated from ${realScanResult.scanner_type} scan results`
        });
      } else {
        // Fallback to mock data if no real scan exists
        scanDataSingle = {
          scan_id: `report-${Date.now()}`,
          scanner_type: reportType,
          region: 'us-east-1',
          status: 'completed',
          timestamp: new Date().toISOString(),
          scan_summary: {
            critical_findings: 5,
            high_findings: 12,
            medium_findings: 8,
            low_findings: 3,
            users: 10,
            roles: 17,
            policies: 25,
            groups: 4
          },
          findings: [
            {
              severity: 'Critical',
              type: 'user',
              resource_name: 'admin-user',
              resource_arn: 'arn:aws:iam::123456789012:user/admin-user',
              description: 'User has active access keys with administrator privileges',
              recommendation: 'Enforce MFA and migrate long-lived user keys to temporary role-based credentials where possible'
            }
          ]
        };
        toast.warning('No scan data found', {
          description: `No ${reportType} scan results available. Using sample data. Run a scan first for real data.`
        });
      }
      scanData = scanDataSingle;
    }

    try {
      // Export in selected formats
      if (exportFormats.pdf) {
        exportScanResultToPDF(scanData, finalReportName);
        toast.success('PDF report generated', {
          description: 'The report will open in a new window for printing'
        });
      }

      if (exportFormats.csv) {
        exportScanResultToCSV(scanData, `${finalReportName}.csv`);
        toast.success('CSV report downloaded');
      }

      if (exportFormats.json) {
        exportScanResultToJSON(scanData, `${finalReportName}.json`);
        toast.success('JSON report downloaded');
      }

      if (!exportFormats.pdf && !exportFormats.csv && !exportFormats.json) {
        toast.warning('Please select at least one export format');
        setIsGenerating(false);
        return;
      }

      // Reset form after a short delay
      setTimeout(() => {
        setIsGenerating(false);
        setShowGenerateDialog(false);
        setReportName("");
        setReportDescription("");
        setReportType(DEFAULT_REPORT_TYPE);
      }, 1000);

    } catch (error) {
      setIsGenerating(false);
      toast.error('Failed to generate report', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "bg-[#00ff88] text-black";
      case "In Progress": return "bg-[#ffb000] text-black";
      case "Failed": return "bg-[#ff0040] text-white";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Incident": return "border-[#ff0040] text-[#ff0040]";
      case "Manual": return "border-[#ffb000] text-[#ffb000]";
      case "Automated": return "border-[#00ff88] text-[#00ff88]";
      default: return "border-border";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Report Generation */}
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Generate New Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
                <Label htmlFor="report-type">Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                  {REPORT_TYPE_TABS.map((tab) => (
                    <SelectItem key={tab.value} value={tab.value}>
                      {tab.label}
                    </SelectItem>
                  ))}
                  </SelectContent>
                </Select>
              <div className="rounded-md border border-dashed border-border bg-muted/40 p-4 space-y-1">
                <h4 className="text-sm font-medium">
                  {selectedReport.title}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {selectedReport.description}
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="report-name">Report Name</Label>
                <Input 
                  id="report-name"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="Enter report name..."
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-description">Description</Label>
                <Textarea 
                  id="report-description"
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Optional description or notes..."
                  className="bg-input border-border resize-none"
                  rows={3}
                />
              </div>
              
              <div>
                <Label>Export Format</Label>
                <div className="flex gap-2 mt-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={exportFormats.pdf}
                      onChange={() => handleFormatChange('pdf')}
                      className="rounded cursor-pointer" 
                    />
                    <span className="text-sm">PDF</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={exportFormats.csv}
                      onChange={() => handleFormatChange('csv')}
                      className="rounded cursor-pointer" 
                    />
                    <span className="text-sm">CSV</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={exportFormats.json}
                      onChange={() => handleFormatChange('json')}
                      className="rounded cursor-pointer" 
                    />
                    <span className="text-sm">JSON</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4 mt-6">
            <Button 
              onClick={generateReport}
              disabled={!reportType || isGenerating}
              className="bg-primary text-primary-foreground hover:bg-primary/80 cyber-glow"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isGenerating ? "Generating..." : "Generate Report"}
            </Button>
            
            <Button variant="outline" className="border-border">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {reports.length > 0 && (
      <Card className="cyber-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Report History</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search reports..."
                  className="pl-10 bg-input border-border w-64"
                />
              </div>
              <Button variant="outline" className="border-border">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Report Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Threats Found</TableHead>
                <TableHead>Processes</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {reports.map((report) => (
                <TableRow key={report.id} className="border-border">
                  <TableCell className="font-medium">{report.name}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={getTypeColor(report.type)}
                    >
                      {report.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">{report.date}</TableCell>
                  <TableCell>
                    <Badge 
                      className={getStatusColor(report.status)}
                    >
                      {report.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={report.threats > 10 ? "text-[#ff0040]" : report.threats > 0 ? "text-[#ffb000]" : "text-[#00ff88]"}>
                      {report.threats}
                    </span>
                  </TableCell>
                  <TableCell>{report.processes}</TableCell>
                  <TableCell>{report.size}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 hover:bg-accent/20"
                          onClick={() => {
                            // Find corresponding scan result and generate report
                            const scanResult = getScanResult('full');
                            if (scanResult) {
                              // Generate PDF from scan result
                              const scanData: ScanResultData = {
                                scan_id: scanResult.scan_id,
                                scanner_type: scanResult.scanner_type,
                                region: scanResult.region,
                                status: scanResult.status,
                                timestamp: scanResult.timestamp,
                                results: scanResult.results,
                                scan_summary: scanResult.scan_summary,
                                findings: scanResult.findings
                              };
                              exportScanResultToPDF(scanData, report.name);
                            } else {
                              toast.warning('Scan data not available', {
                                description: 'The scan results for this report are no longer available'
                              });
                            }
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 hover:bg-accent/20"
                          disabled={report.status === "In Progress"}
                          onClick={() => {
                            const scanResult = getScanResult('full');
                            if (scanResult) {
                              const scanData: ScanResultData = {
                                scan_id: scanResult.scan_id,
                                scanner_type: scanResult.scanner_type,
                                region: scanResult.region,
                                status: scanResult.status,
                                timestamp: scanResult.timestamp,
                                results: scanResult.results,
                                scan_summary: scanResult.scan_summary,
                                findings: scanResult.findings
                              };
                              exportScanResultToPDF(scanData, report.name);
                            }
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      )}

      {/* Report Templates */}
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle>Quick Report Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="cyber-glass p-4 rounded-lg">
              <h4 className="font-medium mb-2">Security Summary</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Complete overview of all security findings
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-border w-full"
                onClick={generateSecuritySummary}
                disabled={isGenerating}
              >
                {isGenerating ? "Generating..." : "Generate"}
              </Button>
            </div>
            
            <div className="cyber-glass p-4 rounded-lg">
              <h4 className="font-medium mb-2">Threat Intelligence</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Detailed analysis of detected threats
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-border w-full"
                onClick={generateThreatIntelligence}
                disabled={isGenerating}
              >
                {isGenerating ? "Generating..." : "Generate"}
              </Button>
            </div>
            
            <div className="cyber-glass p-4 rounded-lg">
              <h4 className="font-medium mb-2">Executive Summary</h4>
              <p className="text-sm text-muted-foreground mb-3">
                High-level summary for management
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-border w-full"
                onClick={generateExecutiveSummary}
                disabled={isGenerating}
              >
                {isGenerating ? "Generating..." : "Generate"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}