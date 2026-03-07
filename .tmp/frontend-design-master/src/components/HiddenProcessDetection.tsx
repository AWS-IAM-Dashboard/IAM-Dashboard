import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { FileUp, Search, AlertTriangle, Eye, EyeOff, Shield } from "lucide-react";

const mockHiddenProcesses = [
  { 
    id: 1, 
    pid: 1337, 
    processName: "stealthminer.exe", 
    status: "Hidden", 
    riskScore: 95, 
    parentPid: 0,
    startTime: "2024-01-10 14:32:15",
    technique: "DKOM"
  },
  { 
    id: 2, 
    pid: 2048, 
    processName: "explorer.exe", 
    status: "Normal", 
    riskScore: 5, 
    parentPid: 1024,
    startTime: "2024-01-10 09:15:30",
    technique: "N/A"
  },
  { 
    id: 3, 
    pid: 4096, 
    processName: "svchost.exe", 
    status: "Hidden", 
    riskScore: 78, 
    parentPid: 512,
    startTime: "2024-01-10 11:45:22",
    technique: "Process Hollowing"
  },
  { 
    id: 4, 
    pid: 8192, 
    processName: "chrome.exe", 
    status: "Normal", 
    riskScore: 12, 
    parentPid: 2048,
    startTime: "2024-01-10 13:20:45",
    technique: "N/A"
  },
  { 
    id: 5, 
    pid: 6666, 
    processName: "rootkit.sys", 
    status: "Hidden", 
    riskScore: 99, 
    parentPid: 4,
    startTime: "2024-01-10 08:30:10",
    technique: "SSDT Hook"
  },
];

export function HiddenProcessDetection() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [hasResults, setHasResults] = useState(false);
  const [filter, setFilter] = useState("all");

  const startAnalysis = () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    const interval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsAnalyzing(false);
          setHasResults(true);
          return 100;
        }
        return prev + 8;
      });
    }, 150);
  };

  const filteredProcesses = mockHiddenProcesses.filter(process => {
    if (filter === "hidden") return process.status === "Hidden";
    if (filter === "normal") return process.status === "Normal";
    if (filter === "high-risk") return process.riskScore > 70;
    return true;
  });

  const getRiskColor = (score: number) => {
    if (score >= 80) return "text-[#ff0040]";
    if (score >= 50) return "text-[#ffb000]";
    return "text-[#00ff88]";
  };

  const getRiskBadge = (score: number) => {
    if (score >= 80) return { variant: "destructive", label: "High Risk", className: "bg-[#ff0040] text-white" };
    if (score >= 50) return { variant: "secondary", label: "Medium Risk", className: "bg-[#ffb000] text-black" };
    return { variant: "default", label: "Low Risk", className: "bg-[#00ff88] text-black" };
  };

  return (
    <div className="p-6 space-y-6">
      {/* Upload Memory Dump */}
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-primary" />
            Memory Dump Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="memory-dump">Upload Memory Dump File</Label>
            <div className="flex gap-2 mt-2">
              <Input 
                id="memory-dump"
                type="file"
                accept=".dmp,.mem,.raw,.vmem"
                placeholder="Select memory dump file..."
                className="bg-input border-border"
              />
              <Button 
                onClick={startAnalysis}
                disabled={isAnalyzing}
                className="bg-primary text-primary-foreground hover:bg-primary/80 cyber-glow min-w-[120px]"
              >
                <Search className="h-4 w-4 mr-2" />
                {isAnalyzing ? "Analyzing..." : "Analyze"}
              </Button>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>Supported formats: .dmp, .mem, .raw, .vmem</p>
            <p>Maximum file size: 8GB</p>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <Card className="cyber-card">
          <CardHeader>
            <CardTitle>Detection Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={analysisProgress} className="h-3" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Scanning for hidden processes...</span>
                <span>{analysisProgress}%</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {analysisProgress < 30 && "Analyzing process structures..."}
                {analysisProgress >= 30 && analysisProgress < 60 && "Detecting DKOM techniques..."}
                {analysisProgress >= 60 && analysisProgress < 90 && "Checking process hollowing..."}
                {analysisProgress >= 90 && "Finalizing analysis..."}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detection Results */}
      {hasResults && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="cyber-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Total Processes</span>
                </div>
                <p className="text-xl font-medium mt-1">{mockHiddenProcesses.length}</p>
              </CardContent>
            </Card>
            
            <Card className="cyber-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-[#ff0040]" />
                  <span className="text-sm text-muted-foreground">Hidden Processes</span>
                </div>
                <p className="text-xl font-medium mt-1 text-[#ff0040]">
                  {mockHiddenProcesses.filter(p => p.status === "Hidden").length}
                </p>
              </CardContent>
            </Card>
            
            <Card className="cyber-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[#ffb000]" />
                  <span className="text-sm text-muted-foreground">High Risk</span>
                </div>
                <p className="text-xl font-medium mt-1 text-[#ffb000]">
                  {mockHiddenProcesses.filter(p => p.riskScore >= 80).length}
                </p>
              </CardContent>
            </Card>
            
            <Card className="cyber-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[#00ff88]" />
                  <span className="text-sm text-muted-foreground">Normal Processes</span>
                </div>
                <p className="text-xl font-medium mt-1 text-[#00ff88]">
                  {mockHiddenProcesses.filter(p => p.status === "Normal").length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filter and Results */}
          <Card className="cyber-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Process Detection Results</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={filter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter("all")}
                    className={filter === "all" ? "bg-primary text-primary-foreground" : "border-border"}
                  >
                    All
                  </Button>
                  <Button
                    variant={filter === "hidden" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter("hidden")}
                    className={filter === "hidden" ? "bg-primary text-primary-foreground" : "border-border"}
                  >
                    Hidden Only
                  </Button>
                  <Button
                    variant={filter === "high-risk" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter("high-risk")}
                    className={filter === "high-risk" ? "bg-primary text-primary-foreground" : "border-border"}
                  >
                    High Risk
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>PID</TableHead>
                    <TableHead>Process Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Parent PID</TableHead>
                    <TableHead>Hiding Technique</TableHead>
                    <TableHead>Start Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProcesses.map((process) => {
                    const riskBadge = getRiskBadge(process.riskScore);
                    
                    return (
                      <TableRow key={process.id} className="border-border">
                        <TableCell className="font-mono">{process.pid}</TableCell>
                        <TableCell className="font-mono">{process.processName}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={process.status === "Hidden" ? "destructive" : "default"}
                            className={process.status === "Hidden" ? "bg-[#ff0040] text-white" : "bg-[#00ff88] text-black"}
                          >
                            {process.status === "Hidden" ? (
                              <><EyeOff className="h-3 w-3 mr-1" /> Hidden</>
                            ) : (
                              <><Eye className="h-3 w-3 mr-1" /> Normal</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${getRiskColor(process.riskScore)}`}>
                              {process.riskScore}
                            </span>
                            <Badge 
                              variant={riskBadge.variant as any}
                              className={riskBadge.className}
                            >
                              {riskBadge.label}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{process.parentPid}</TableCell>
                        <TableCell>
                          <span className={process.technique !== "N/A" ? "text-[#ff0040]" : "text-muted-foreground"}>
                            {process.technique}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{process.startTime}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}