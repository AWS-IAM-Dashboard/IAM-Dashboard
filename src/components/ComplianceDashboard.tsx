import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Skeleton } from "./ui/skeleton";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, AreaChart, Area } from "recharts";
import { CalendarClock, RefreshCcw, ShieldAlert, ShieldCheck, Target, TrendingUp, Info, ChevronDown, ExternalLink } from "lucide-react";
import { useScanResults } from "../context/ScanResultsContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { maskSensitiveData } from "../utils/security";
import { formatRelativeTime } from "../utils/ui";

// Framework descriptions for tooltips
const frameworkDescriptions: Record<string, string> = {
  cis: "CIS AWS Foundations Benchmark - Industry best practices for securing AWS infrastructure. Covers IAM, S3, EC2, logging, and monitoring. Open controls indicate security requirements not yet fully implemented.",
  soc2: "SOC 2 Trust Services - Security, availability, processing integrity, confidentiality, and privacy controls for service organizations. Open controls are requirements that need remediation or evidence collection.",
  pci: "PCI-DSS - Payment Card Industry Data Security Standard. Requirements for organizations that handle credit card data. Open controls represent gaps in cardholder data protection measures.",
  hipaa: "HIPAA Security Rule - Federal requirements for protecting electronic protected health information (ePHI) in healthcare. Open controls indicate missing safeguards for health data protection."
};

const openControlsExplanation = "Open controls are security requirements from compliance frameworks that are not yet fully implemented, have findings that need remediation, or lack proper evidence/documentation. Lower open controls = better compliance posture.";

const complianceFrameworks = [
  {
    id: "cis",
    name: "CIS AWS Foundations",
    score: 82,
    lastAudited: "2 days ago",
    totalControls: 84,
    openControls: 7,
    criticalFindings: 2,
    trend: [
      { month: "Jun", score: 74 },
      { month: "Jul", score: 78 },
      { month: "Aug", score: 80 },
      { month: "Sep", score: 81 },
      { month: "Oct", score: 82 },
    ],
  },
  {
    id: "soc2",
    name: "SOC 2 Trust Services",
    score: 76,
    lastAudited: "5 days ago",
    totalControls: 96,
    openControls: 11,
    criticalFindings: 3,
    trend: [
      { month: "Jun", score: 68 },
      { month: "Jul", score: 70 },
      { month: "Aug", score: 72 },
      { month: "Sep", score: 75 },
      { month: "Oct", score: 76 },
    ],
  },
  {
    id: "pci",
    name: "PCI-DSS",
    score: 88,
    lastAudited: "1 day ago",
    totalControls: 112,
    openControls: 5,
    criticalFindings: 1,
    trend: [
      { month: "Jun", score: 80 },
      { month: "Jul", score: 82 },
      { month: "Aug", score: 85 },
      { month: "Sep", score: 86 },
      { month: "Oct", score: 88 },
    ],
  },
  {
    id: "hipaa",
    name: "HIPAA Security Rule",
    score: 73,
    lastAudited: "9 days ago",
    totalControls: 64,
    openControls: 14,
    criticalFindings: 4,
    trend: [
      { month: "Jun", score: 62 },
      { month: "Jul", score: 65 },
      { month: "Aug", score: 70 },
      { month: "Sep", score: 72 },
      { month: "Oct", score: 73 },
    ],
  },
];

const openActions = [
  {
    id: "IAM-001",
    framework: "CIS AWS Foundations",
    control: "1.1 – Root account MFA enabled",
    owner: "Cloud Security",
    dueDate: "Nov 18",
    status: "In Progress",
    severity: "High",
  },
  {
    id: "S3-014",
    framework: "SOC 2",
    control: "3.3 – Encryption enforced at rest",
    owner: "Storage Team",
    dueDate: "Nov 22",
    status: "Planned",
    severity: "Medium",
  },
  {
    id: "EC2-027",
    framework: "PCI-DSS",
    control: "7.1 – Restrict access to cardholder data",
    owner: "Platform",
    dueDate: "Dec 02",
    status: "Blocked",
    severity: "Critical",
  },
  {
    id: "LOG-039",
    framework: "HIPAA",
    control: "164.312(b) – Audit controls implemented",
    owner: "Compliance",
    dueDate: "Nov 29",
    status: "In Progress",
    severity: "High",
  },
];

// Recent audits will be generated from scan results

const frameworkScores = complianceFrameworks.map((framework) => ({
  name: framework.name,
  score: framework.score,
  open: framework.openControls,
  critical: framework.criticalFindings,
}));

const statusColorMap: Record<string, string> = {
  "On Track": "bg-[#00ff88] text-black",
  "Action Required": "bg-[#ffb000] text-black",
  "In Review": "bg-[#1f2937] text-white border border-border",
};

const severityColorMap: Record<string, string> = {
  Critical: "bg-[#ff0040] text-white",
  High: "bg-[#ff6b35] text-white",
  Medium: "bg-[#ffb000] text-black",
  Low: "bg-[#00ff88] text-black",
};

const statusBadgeColor: Record<string, string> = {
  "In Progress": "bg-primary text-primary-foreground",
  Planned: "bg-muted text-muted-foreground",
  Blocked: "bg-[#ff0040] text-white",
};

// Use shared formatRelativeTime utility
const formatTimestamp = formatRelativeTime;

// Map finding types to compliance frameworks
const mapFindingToFrameworks = (finding: any): string[] => {
  const frameworks: string[] = [];
  const findingType = (finding.type || finding.finding_type || finding.resource_type || '').toLowerCase();
  const description = (finding.description || '').toLowerCase();
  
  // CIS AWS Foundations - covers IAM, S3, EC2, etc.
  if (findingType.includes('iam') || findingType.includes('user') || findingType.includes('role') || 
      findingType.includes('policy') || findingType.includes('mfa') || findingType.includes('access') ||
      findingType.includes('s3') || findingType.includes('bucket') ||
      findingType.includes('ec2') || findingType.includes('security') ||
      description.includes('encryption') || description.includes('public')) {
    frameworks.push('cis');
  }
  
  // SOC 2 - covers access controls, encryption, monitoring
  if (findingType.includes('access') || findingType.includes('encryption') || 
      findingType.includes('logging') || findingType.includes('monitoring') ||
      description.includes('access control') || description.includes('encryption')) {
    frameworks.push('soc2');
  }
  
  // PCI-DSS - covers data protection, access controls
  if (findingType.includes('encryption') || findingType.includes('data') ||
      description.includes('cardholder') || description.includes('pci') ||
      description.includes('data protection')) {
    frameworks.push('pci');
  }
  
  // HIPAA - covers access controls, encryption, audit logs
  if (findingType.includes('access') || findingType.includes('encryption') ||
      findingType.includes('audit') || findingType.includes('logging') ||
      description.includes('phi') || description.includes('hipaa') ||
      description.includes('health')) {
    frameworks.push('hipaa');
  }
  
  return frameworks.length > 0 ? frameworks : ['cis']; // Default to CIS if no match
};

interface ComplianceDashboardProps {
  onNavigate?: (tab: string) => void;
}

export function ComplianceDashboard({ onNavigate }: ComplianceDashboardProps) {
  const [activeFramework, setActiveFramework] = useState(complianceFrameworks[0].id);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { getAllScanResults, scanResultsVersion } = useScanResults();

  // Get all scan results
  const scanResults = useMemo(() => {
    return getAllScanResults();
  }, [scanResultsVersion, getAllScanResults]);

  // Calculate compliance metrics from real scan data
  const complianceMetrics = useMemo(() => {
    let totalCritical = 0;
    let totalHigh = 0;
    let totalMedium = 0;
    let totalLow = 0;
    const allFindings: any[] = [];
    const frameworkFindings: Record<string, any[]> = {
      cis: [],
      soc2: [],
      pci: [],
      hipaa: []
    };

    // Aggregate findings from all scans
    scanResults.forEach(scan => {
      const findings = scan.findings || [];
      const summary = scan.scan_summary || {};
      
      totalCritical += summary.critical_findings || 0;
      totalHigh += summary.high_findings || 0;
      totalMedium += summary.medium_findings || 0;
      totalLow += summary.low_findings || 0;
      
      // Map findings to frameworks
      findings.forEach((finding: any) => {
        allFindings.push(finding);
        const frameworks = mapFindingToFrameworks(finding);
        frameworks.forEach(fw => {
          if (!frameworkFindings[fw]) frameworkFindings[fw] = [];
          frameworkFindings[fw].push(finding);
        });
      });
    });

    // Calculate compliance scores per framework
    const calculateFrameworkScore = (findings: any[]): number => {
      if (findings.length === 0) return 100;
      const critical = findings.filter(f => (f.severity || '').toLowerCase() === 'critical').length;
      const high = findings.filter(f => (f.severity || '').toLowerCase() === 'high').length;
      const medium = findings.filter(f => (f.severity || '').toLowerCase() === 'medium').length;
      const low = findings.filter(f => (f.severity || '').toLowerCase() === 'low').length;
      
      const deduction = (critical * 10) + (high * 5) + (medium * 2) + (low * 1);
      return Math.max(0, Math.round(100 - deduction));
    };

    // Update framework scores based on real findings
    const updatedFrameworks = complianceFrameworks.map(framework => {
      const frameworkFindingsList = frameworkFindings[framework.id] || [];
      const score = calculateFrameworkScore(frameworkFindingsList);
      const criticalCount = frameworkFindingsList.filter(f => (f.severity || '').toLowerCase() === 'critical').length;
      
      return {
        ...framework,
        score,
        criticalFindings: criticalCount,
        openControls: Math.max(0, framework.totalControls - Math.round(framework.totalControls * (score / 100)))
      };
    });

    // Calculate overall compliance score
    const overallScore = updatedFrameworks.length > 0
      ? Math.round(updatedFrameworks.reduce((acc, f) => acc + f.score, 0) / updatedFrameworks.length)
      : 100;

    // Get most recent scan timestamp
    const mostRecentScan = scanResults.length > 0
      ? scanResults.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
      : null;

    // Generate recent audits from scan history
    const recentAudits = scanResults
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 3)
      .map(scan => {
        const scanDate = new Date(scan.timestamp);
        const findingsCount = scan.findings?.length || 0;
        const summary = scan.scan_summary || {};
        const criticalCount = summary.critical_findings || 0;
        
        let outcome = 'On Track';
        if (criticalCount > 0) outcome = 'Action Required';
        else if (findingsCount > 10) outcome = 'In Review';
        
        return {
          name: `${scan.scanner_type.toUpperCase()} Security Scan`,
          performedBy: 'Automated Scanner',
          completedOn: scanDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          coverage: `${findingsCount} findings evaluated`,
          outcome
        };
      });

    // Generate open actions from critical/high findings
    const openActions = allFindings
      .filter(f => {
        const severity = (f.severity || '').toLowerCase();
        return severity === 'critical' || severity === 'high';
      })
      .slice(0, 10)
      .map((finding, index) => {
        const frameworks = mapFindingToFrameworks(finding);
        const frameworkName = frameworks.length > 0 
          ? complianceFrameworks.find(f => f.id === frameworks[0])?.name || 'CIS AWS Foundations'
          : 'CIS AWS Foundations';
        
        return {
          id: finding.id || `FINDING-${index + 1}`,
          framework: frameworkName,
          control: finding.description?.substring(0, 50) || finding.finding_type || 'Security Control',
          owner: 'Security Team',
          dueDate: 'ASAP',
          status: 'In Progress',
          severity: (finding.severity || 'High').charAt(0).toUpperCase() + (finding.severity || 'High').slice(1).toLowerCase()
        };
      });

    return {
      overallScore,
      criticalFindingsTotal: totalCritical,
      frameworks: updatedFrameworks,
      allFindings,
      frameworkFindings, // Expose framework-specific findings
      mostRecentScan: mostRecentScan ? formatTimestamp(mostRecentScan.timestamp) : 'Never',
      totalFindings: totalCritical + totalHigh + totalMedium + totalLow,
      recentAudits: recentAudits.length > 0 ? recentAudits : [
        {
          name: 'No scans performed yet',
          performedBy: 'N/A',
          completedOn: 'N/A',
          coverage: '0 findings evaluated',
          outcome: 'Pending'
        }
      ],
      openActions: openActions.length > 0 ? openActions : []
    };
  }, [scanResults]);

  const selectedFramework = useMemo(
    () => complianceMetrics.frameworks.find((framework) => framework.id === activeFramework) ?? complianceMetrics.frameworks[0],
    [activeFramework, complianceMetrics.frameworks]
  );

  const frameworkScores = useMemo(() => 
    complianceMetrics.frameworks.map((framework) => ({
      name: framework.name,
      score: framework.score,
      open: framework.openControls,
      critical: framework.criticalFindings,
    })),
    [complianceMetrics.frameworks]
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1200);
  };

  return (
    <div className="max-w-full overflow-x-hidden p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">Compliance Dashboard</h1>
          <p className="text-muted-foreground">Track adherence to key security frameworks across your AWS estate.</p>
        </div>
        <Button
          variant="outline"
          className="w-full sm:w-auto border-border"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCcw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh Metrics
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="cyber-card">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Overall Compliance</span>
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <p className="text-4xl font-semibold">{complianceMetrics.overallScore}%</p>
            <Progress value={complianceMetrics.overallScore} className="h-2" />
            <p className="text-xs text-muted-foreground">Across {complianceMetrics.frameworks.length} active frameworks</p>
          </CardContent>
        </Card>
        <Card className="cyber-card">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Critical Findings</span>
              <ShieldAlert className="h-6 w-6 text-[#ff0040]" />
            </div>
            <p className="text-4xl font-semibold text-[#ff0040]">{complianceMetrics.criticalFindingsTotal}</p>
            <p className="text-xs text-muted-foreground">Requires immediate remediation</p>
            <Badge variant="outline" className="w-fit border-[#ff0040]/60 text-xs">
              Auto escalation enabled
            </Badge>
          </CardContent>
        </Card>
        <Card className="cyber-card">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Upcoming Audits</span>
              <CalendarClock className="h-6 w-6 text-primary" />
            </div>
            <p className="text-4xl font-semibold">{scanResults.length}</p>
            <p className="text-xs text-muted-foreground">Last scan: {complianceMetrics.mostRecentScan}</p>
            <Badge className="w-fit bg-primary/10 text-primary">Automated evidence collection ready</Badge>
          </CardContent>
        </Card>
        <Card className="cyber-card">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Positive Trend</span>
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <p className="text-4xl font-semibold">{complianceMetrics.totalFindings}</p>
            <p className="text-xs text-muted-foreground">Total security findings across all scans</p>
            <Badge variant="outline" className="w-fit border-primary/40 text-primary">
              Continuous monitoring enabled
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card className="cyber-card">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Framework Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {isRefreshing ? (
                <Skeleton className="h-[260px] w-full bg-muted/20" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={frameworkScores} barCategoryGap={24}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.1)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.95)",
                        border: "1px solid rgba(0, 255, 136, 0.3)",
                        borderRadius: "8px",
                        color: "#e2e8f0",
                      }}
                      cursor={{ fill: "rgba(0, 255, 136, 0.05)" }}
                    />
                    <Bar dataKey="score" name="Compliance Score" fill="#00ff88" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="open" name="Open Controls" fill="#ffb000" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="critical" name="Critical Findings" fill="#ff0040" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="space-y-4">
              {complianceMetrics.frameworks.map((framework) => {
                const findings = complianceMetrics.frameworkFindings?.[framework.id] || [];
                const hasFindings = findings.length > 0;
                const criticalCount = findings.filter(f => (f.severity || '').toLowerCase() === 'critical').length;
                const highCount = findings.filter(f => (f.severity || '').toLowerCase() === 'high').length;

                return (
                  <DropdownMenu key={framework.id}>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={() => setActiveFramework(framework.id)}
                        className={`w-full text-left p-4 rounded-lg transition-all border ${
                          framework.id === activeFramework
                            ? "cyber-glow border-primary/60 bg-primary/10"
                            : "border-transparent bg-muted/5 hover:bg-muted/10"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{framework.name}</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">{frameworkDescriptions[framework.id] || "Compliance framework for AWS security."}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasFindings && (
                              <Badge className="text-xs bg-[#ff0040]/20 text-[#ff0040] border-[#ff0040]/40">
                                {findings.length}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {framework.score}%
                            </Badge>
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-muted-foreground">Last audited {framework.lastAudited}</p>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">{framework.openControls} open controls</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-muted-foreground hover:text-primary cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">{openControlsExplanation}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </button>
                    </DropdownMenuTrigger>
                    {hasFindings && (
                      <DropdownMenuContent className="w-[400px] max-h-[500px] overflow-y-auto" align="start">
                        <DropdownMenuLabel className="flex items-center justify-between">
                          <span>Findings Impacting {framework.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {findings.length} total
                          </Badge>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {criticalCount > 0 && (
                          <>
                            <DropdownMenuLabel className="text-xs text-[#ff0040] font-semibold">
                              Critical ({criticalCount})
                            </DropdownMenuLabel>
                            {findings
                              .filter(f => (f.severity || '').toLowerCase() === 'critical')
                              .slice(0, 3)
                              .map((finding: any, idx: number) => (
                                <DropdownMenuItem key={finding.id || `critical-${idx}`} className="flex-col items-start p-3 cursor-default">
                                  <div className="flex items-start gap-2 w-full">
                                    <Badge className="text-xs bg-[#ff0040] text-white">Critical</Badge>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate">{finding.finding_type || 'Security Finding'}</p>
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {maskSensitiveData(finding.description || finding.message || 'No description')}
                                      </p>
                                      {finding.resource_id && (
                                        <p className="text-xs text-muted-foreground/70 mt-1 truncate">
                                          {maskSensitiveData(finding.resource_id)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </DropdownMenuItem>
                              ))}
                            {criticalCount > 3 && (
                              <DropdownMenuItem 
                                className="text-xs text-primary cursor-pointer"
                                onClick={() => onNavigate?.('alerts')}
                              >
                                View {criticalCount - 3} more critical findings →
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {highCount > 0 && (
                          <>
                            <DropdownMenuLabel className="text-xs text-[#ffb000] font-semibold">
                              High ({highCount})
                            </DropdownMenuLabel>
                            {findings
                              .filter(f => (f.severity || '').toLowerCase() === 'high')
                              .slice(0, 3)
                              .map((finding: any, idx: number) => (
                                <DropdownMenuItem key={finding.id || `high-${idx}`} className="flex-col items-start p-3 cursor-default">
                                  <div className="flex items-start gap-2 w-full">
                                    <Badge className="text-xs bg-[#ffb000] text-white">High</Badge>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate">{finding.finding_type || 'Security Finding'}</p>
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {maskSensitiveData(finding.description || finding.message || 'No description')}
                                      </p>
                                      {finding.resource_id && (
                                        <p className="text-xs text-muted-foreground/70 mt-1 truncate">
                                          {maskSensitiveData(finding.resource_id)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </DropdownMenuItem>
                              ))}
                            {highCount > 3 && (
                              <DropdownMenuItem 
                                className="text-xs text-primary cursor-pointer"
                                onClick={() => onNavigate?.('alerts')}
                              >
                                View {highCount - 3} more high findings →
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {findings.filter(f => {
                          const severity = (f.severity || '').toLowerCase();
                          return severity !== 'critical' && severity !== 'high';
                        }).length > 0 && (
                          <>
                            <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold">
                              Other ({findings.filter(f => {
                                const severity = (f.severity || '').toLowerCase();
                                return severity !== 'critical' && severity !== 'high';
                              }).length})
                            </DropdownMenuLabel>
                            {findings
                              .filter(f => {
                                const severity = (f.severity || '').toLowerCase();
                                return severity !== 'critical' && severity !== 'high';
                              })
                              .slice(0, 2)
                              .map((finding: any, idx: number) => (
                                <DropdownMenuItem key={finding.id || `other-${idx}`} className="flex-col items-start p-3 cursor-default">
                                  <div className="flex items-start gap-2 w-full">
                                    <Badge className="text-xs bg-muted text-foreground">
                                      {(finding.severity || 'Medium').charAt(0).toUpperCase() + (finding.severity || 'Medium').slice(1).toLowerCase()}
                                    </Badge>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate">{finding.finding_type || 'Security Finding'}</p>
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {maskSensitiveData(finding.description || finding.message || 'No description')}
                                      </p>
                                    </div>
                                  </div>
                                </DropdownMenuItem>
                              ))}
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-primary cursor-pointer font-medium"
                          onClick={() => onNavigate?.('alerts')}
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-2" />
                          View All Findings in Security Alerts
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    )}
                  </DropdownMenu>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-muted/5 border border-border/60">
              <CardHeader>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  {selectedFramework.name} Trend
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">{frameworkDescriptions[selectedFramework.id] || "Compliance framework for AWS security."}</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isRefreshing ? (
                  <Skeleton className="h-[200px] w-full bg-muted/20" />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={selectedFramework.trend}>
                      <defs>
                        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="10%" stopColor="#00ff88" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.1)" vertical={false} />
                      <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} domain={[60, 100]} />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "rgba(15, 23, 42, 0.95)",
                          border: "1px solid rgba(0, 255, 136, 0.3)",
                          borderRadius: "8px",
                          color: "#e2e8f0",
                        }}
                        cursor={{ stroke: "rgba(0, 255, 136, 0.4)", strokeWidth: 2 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#00ff88"
                        fillOpacity={1}
                        fill="url(#trendGradient)"
                        strokeWidth={2}
                        name="Score"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="cyber-glass border border-border/60">
              <CardHeader>
                <CardTitle className="text-base font-medium">Framework Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Open controls</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">{openControlsExplanation}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <span className="text-sm font-medium">{selectedFramework.openControls}</span>
                </div>
                <Progress value={(selectedFramework.totalControls - selectedFramework.openControls) / selectedFramework.totalControls * 100} className="h-2" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total controls</span>
                  <span className="text-sm font-medium">{selectedFramework.totalControls}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Critical findings</span>
                  <Badge className="text-xs bg-[#ff0040] text-white">
                    {selectedFramework.criticalFindings}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Last audited</span>
                  <span className="text-sm font-medium">{selectedFramework.lastAudited}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="audits" className="space-y-6">
        <TabsList className="cyber-card border-border">
          <TabsTrigger value="audits">Audit History</TabsTrigger>
          <TabsTrigger value="evidence">Evidence Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="audits">
          <Card className="cyber-card">
            <CardHeader>
              <CardTitle>Recent Audits & Reviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {complianceMetrics.recentAudits.map((audit) => (
                <div key={audit.name} className="cyber-glass rounded-lg p-4 border border-border/50">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{audit.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {audit.coverage} · Completed {audit.completedOn}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        {audit.performedBy}
                      </Badge>
                      <Badge className={`text-xs ${statusColorMap[audit.outcome] ?? "bg-muted text-muted-foreground"}`}>
                        {audit.outcome}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evidence">
          <Card className="cyber-card">
            <CardHeader>
              <CardTitle>Evidence Collection Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="cyber-glass rounded-lg p-4 border border-border/50 space-y-3">
                <p className="text-sm font-medium">Policies & Procedures</p>
                <Badge className="w-fit bg-primary/10 text-primary">34 / 36 Updated</Badge>
                <p className="text-xs text-muted-foreground">
                  Automated policy sync captures updates from the source repository every 12 hours.
                </p>
              </div>
              <div className="cyber-glass rounded-lg p-4 border border-border/50 space-y-3">
                <p className="text-sm font-medium">Technical Evidence</p>
                <Badge className="w-fit bg-primary/10 text-primary">128 artifacts</Badge>
                <p className="text-xs text-muted-foreground">
                  Includes IAM reports, S3 bucket policies, CloudTrail exports, and GuardDuty findings.
                </p>
              </div>
              <div className="cyber-glass rounded-lg p-4 border border-border/50 space-y-3">
                <p className="text-sm font-medium">Compensating Controls</p>
                <Badge className="w-fit bg-primary/10 text-primary">8 documented</Badge>
                <p className="text-xs text-muted-foreground">
                  Linked to high-risk controls awaiting remediation with reviewer sign-off.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


