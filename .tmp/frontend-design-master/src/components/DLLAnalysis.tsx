import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { FileUp, Search, FileCode2, AlertTriangle, Shield, Download } from "lucide-react";

const mockDLLData = [
  {
    id: 1,
    dllName: "kernel32.dll",
    path: "C:\\Windows\\System32\\kernel32.dll",
    suspicious: false,
    riskScore: 5,
    size: "1.2 MB",
    version: "10.0.19041.1",
    hash: "a1b2c3d4e5f6...",
    loadedBy: ["explorer.exe", "chrome.exe"],
    signature: "Valid (Microsoft)",
  },
  {
    id: 2,
    dllName: "malicious.dll",
    path: "C:\\Temp\\malicious.dll",
    suspicious: true,
    riskScore: 95,
    size: "245 KB",
    version: "N/A",
    hash: "deadbeef1234...",
    loadedBy: ["unknown.exe"],
    signature: "Invalid",
  },
  {
    id: 3,
    dllName: "user32.dll",
    path: "C:\\Windows\\System32\\user32.dll",
    suspicious: false,
    riskScore: 8,
    size: "1.8 MB",
    version: "10.0.19041.1",
    hash: "f6e5d4c3b2a1...",
    loadedBy: ["explorer.exe", "notepad.exe"],
    signature: "Valid (Microsoft)",
  },
  {
    id: 4,
    dllName: "injected.dll",
    path: "C:\\Users\\Public\\injected.dll",
    suspicious: true,
    riskScore: 87,
    size: "89 KB",
    version: "1.0.0.0",
    hash: "1337h4x0r...",
    loadedBy: ["svchost.exe"],
    signature: "None",
  },
  {
    id: 5,
    dllName: "ntdll.dll",
    path: "C:\\Windows\\System32\\ntdll.dll",
    suspicious: false,
    riskScore: 12,
    size: "2.1 MB",
    version: "10.0.19041.1",
    hash: "b2a1f6e5d4c3...",
    loadedBy: ["All processes"],
    signature: "Valid (Microsoft)",
  },
];

export function DLLAnalysis() {
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
        return prev + 12;
      });
    }, 200);
  };

  const filteredDLLs = mockDLLData.filter(dll => {
    if (filter === "suspicious") return dll.suspicious;
    if (filter === "safe") return !dll.suspicious;
    if (filter === "high-risk") return dll.riskScore >= 80;
    return true;
  });

  const getRiskColor = (score: number) => {
    if (score >= 80) return "text-[#ff0040]";
    if (score >= 50) return "text-[#ffb000]";
    return "text-[#00ff88]";
  };

  const getSignatureColor = (signature: string) => {
    if (signature.includes("Valid")) return "text-[#00ff88]";
    if (signature === "None" || signature === "Invalid") return "text-[#ff0040]";
    return "text-muted-foreground";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Upload Memory Image */}
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode2 className="h-5 w-5 text-primary" />
            DLL Extraction & Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="memory-image">Upload Memory Image</Label>
            <div className="flex gap-2 mt-2">
              <Input 
                id="memory-image"
                type="file"
                accept=".dmp,.mem,.raw,.vmem,.img"
                placeholder="Select memory image file..."
                className="bg-input border-border"
              />
              <Button 
                onClick={startAnalysis}
                disabled={isAnalyzing}
                className="bg-primary text-primary-foreground hover:bg-primary/80 cyber-glow min-w-[120px]"
              >
                <Search className="h-4 w-4 mr-2" />
                {isAnalyzing ? "Extracting..." : "Extract DLLs"}
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Analysis Options</Label>
              <div className="space-y-2 mt-2">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Extract all loaded DLLs</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Signature verification</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Hash analysis</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Export to disk</span>
                </label>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Supported formats:</strong> .dmp, .mem, .raw, .vmem, .img</p>
              <p><strong>Maximum file size:</strong> 16GB</p>
              <p><strong>Detection methods:</strong> Process memory scanning, VAD analysis</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <Card className="cyber-card">
          <CardHeader>
            <CardTitle>DLL Extraction Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={analysisProgress} className="h-3" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Extracting DLLs from memory image...</span>
                <span>{analysisProgress}%</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {analysisProgress < 25 && "Parsing memory structure..."}
                {analysisProgress >= 25 && analysisProgress < 50 && "Identifying loaded modules..."}
                {analysisProgress >= 50 && analysisProgress < 75 && "Extracting DLL data..."}
                {analysisProgress >= 75 && "Performing signature verification..."}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {hasResults && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="cyber-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <FileCode2 className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Total DLLs</span>
                </div>
                <p className="text-xl font-medium mt-1">{mockDLLData.length}</p>
              </CardContent>
            </Card>
            
            <Card className="cyber-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[#ff0040]" />
                  <span className="text-sm text-muted-foreground">Suspicious</span>
                </div>
                <p className="text-xl font-medium mt-1 text-[#ff0040]">
                  {mockDLLData.filter(dll => dll.suspicious).length}
                </p>
              </CardContent>
            </Card>
            
            <Card className="cyber-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[#00ff88]" />
                  <span className="text-sm text-muted-foreground">Safe</span>
                </div>
                <p className="text-xl font-medium mt-1 text-[#00ff88]">
                  {mockDLLData.filter(dll => !dll.suspicious).length}
                </p>
              </CardContent>
            </Card>
            
            <Card className="cyber-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Extracted Size</span>
                </div>
                <p className="text-xl font-medium mt-1">6.5 MB</p>
              </CardContent>
            </Card>
          </div>

          {/* DLL Analysis Results */}
          <Card className="cyber-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Extracted DLL Analysis</CardTitle>
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
                    variant={filter === "suspicious" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter("suspicious")}
                    className={filter === "suspicious" ? "bg-primary text-primary-foreground" : "border-border"}
                  >
                    Suspicious
                  </Button>
                  <Button
                    variant={filter === "safe" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter("safe")}
                    className={filter === "safe" ? "bg-primary text-primary-foreground" : "border-border"}
                  >
                    Safe
                  </Button>
                  <Button variant="outline" className="border-border">
                    <Download className="h-4 w-4 mr-2" />
                    Export All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>DLL Name</TableHead>
                    <TableHead>Path</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Signature</TableHead>
                    <TableHead>Loaded By</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDLLs.map((dll) => (
                    <TableRow key={dll.id} className="border-border">
                      <TableCell className="font-mono font-medium">{dll.dllName}</TableCell>
                      <TableCell className="font-mono text-xs max-w-xs truncate" title={dll.path}>
                        {dll.path}
                      </TableCell>
                      <TableCell>{dll.size}</TableCell>
                      <TableCell>
                        <span className={`font-medium ${getRiskColor(dll.riskScore)}`}>
                          {dll.riskScore}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={getSignatureColor(dll.signature)}>
                          {dll.signature}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="text-xs">
                          {dll.loadedBy.slice(0, 2).map((process, i) => (
                            <div key={i} className="font-mono">{process}</div>
                          ))}
                          {dll.loadedBy.length > 2 && (
                            <div className="text-muted-foreground">+{dll.loadedBy.length - 2} more</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={dll.suspicious ? "destructive" : "default"}
                          className={dll.suspicious ? "bg-[#ff0040] text-white" : "bg-[#00ff88] text-black"}
                        >
                          {dll.suspicious ? "Suspicious" : "Safe"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}