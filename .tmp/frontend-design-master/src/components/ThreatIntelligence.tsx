import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Globe, Search, ExternalLink, Shield, AlertTriangle, Target, Hash, Globe2, Server } from "lucide-react";

const mockVirusTotalData = [
  {
    hash: "a1b2c3d4e5f6789012345678901234567890abcd",
    verdict: "Malicious",
    detectionRatio: "45/70",
    engines: ["Kaspersky", "Symantec", "McAfee", "Windows Defender"],
    firstSeen: "2024-01-08",
    lastSeen: "2024-01-10"
  },
  {
    hash: "f6e5d4c3b2a1098765432109876543210fedcba9",
    verdict: "Clean", 
    detectionRatio: "0/70",
    engines: [],
    firstSeen: "2024-01-05",
    lastSeen: "2024-01-10"
  }
];

const mockMitreData = [
  {
    technique: "Process Hollowing",
    id: "T1055.012",
    tactic: "Defense Evasion",
    description: "Adversaries may inject malicious code into suspended and hollowed processes.",
    detectedIn: ["svchost.exe", "explorer.exe"],
    severity: "High"
  },
  {
    technique: "DKOM",
    id: "T1014",
    tactic: "Defense Evasion", 
    description: "Adversaries may modify the kernel to hide the presence of programs.",
    detectedIn: ["rootkit.sys"],
    severity: "Critical"
  },
  {
    technique: "DLL Injection",
    id: "T1055.001",
    tactic: "Defense Evasion",
    description: "Adversaries may inject dynamic-link libraries (DLLs) into processes.",
    detectedIn: ["malicious.dll"],
    severity: "Medium"
  }
];

const mockIOCData = [
  {
    type: "IP",
    value: "192.168.1.100",
    threat: "C2 Server",
    confidence: "High",
    firstSeen: "2024-01-09",
    source: "Internal Detection"
  },
  {
    type: "Hash",
    value: "deadbeef1234567890abcdef",
    threat: "Malware",
    confidence: "High", 
    firstSeen: "2024-01-08",
    source: "VirusTotal"
  },
  {
    type: "Domain",
    value: "malicious-domain.com",
    threat: "Phishing",
    confidence: "Medium",
    firstSeen: "2024-01-07",
    source: "Threat Feed"
  },
  {
    type: "IP",
    value: "10.0.0.50",
    threat: "Botnet",
    confidence: "High",
    firstSeen: "2024-01-10",
    source: "External Feed"
  }
];

export function ThreatIntelligence() {
  const [hashInput, setHashInput] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupResults, setLookupResults] = useState<any[]>([]);

  const performHashLookup = () => {
    setIsLookingUp(true);
    // Simulate API call
    setTimeout(() => {
      setLookupResults(mockVirusTotalData.filter(item => 
        item.hash.toLowerCase().includes(hashInput.toLowerCase())
      ));
      setIsLookingUp(false);
    }, 1500);
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case "Malicious": return "bg-[#ff0040] text-white";
      case "Suspicious": return "bg-[#ffb000] text-black";
      case "Clean": return "bg-[#00ff88] text-black";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Critical": return "text-[#ff0040]";
      case "High": return "text-[#ff6b40]";
      case "Medium": return "text-[#ffb000]";
      case "Low": return "text-[#00ff88]";
      default: return "text-muted-foreground";
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "High": return "text-[#00ff88]";
      case "Medium": return "text-[#ffb000]";
      case "Low": return "text-[#ff6b40]";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Threat Intelligence Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="cyber-glass p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="h-4 w-4 text-primary" />
                <span className="text-sm">Hash Lookups Today</span>
              </div>
              <p className="text-2xl font-medium">127</p>
            </div>
            
            <div className="cyber-glass p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-[#ff0040]" />
                <span className="text-sm">MITRE Techniques</span>
              </div>
              <p className="text-2xl font-medium">15</p>
            </div>
            
            <div className="cyber-glass p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Globe2 className="h-4 w-4 text-[#ffb000]" />
                <span className="text-sm">Active IOCs</span>
              </div>
              <p className="text-2xl font-medium">342</p>
            </div>
            
            <div className="cyber-glass p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-[#00ff88]" />
                <span className="text-sm">Feed Status</span>
              </div>
              <p className="text-sm text-[#00ff88]">All Connected</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="hash-lookup" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-card border border-border">
          <TabsTrigger value="hash-lookup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Hash Lookup
          </TabsTrigger>
          <TabsTrigger value="mitre-mapping" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            MITRE ATT&CK
          </TabsTrigger>
          <TabsTrigger value="ioc-feeds" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            IOC Feeds
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hash-lookup" className="space-y-6">
          <Card className="cyber-card">
            <CardHeader>
              <CardTitle>VirusTotal Hash Lookup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="hash-input">File Hash (MD5, SHA1, SHA256)</Label>
                  <Input
                    id="hash-input"
                    value={hashInput}
                    onChange={(e) => setHashInput(e.target.value)}
                    placeholder="Enter file hash..."
                    className="bg-input border-border font-mono"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={performHashLookup}
                    disabled={!hashInput || isLookingUp}
                    className="bg-primary text-primary-foreground hover:bg-primary/80 cyber-glow"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {isLookingUp ? "Looking up..." : "Lookup"}
                  </Button>
                </div>
              </div>

              {lookupResults.length > 0 && (
                <div className="space-y-4">
                  {lookupResults.map((result, index) => (
                    <div key={index} className="cyber-glass p-4 rounded-lg">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-mono text-sm text-muted-foreground">{result.hash}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={getVerdictColor(result.verdict)}>
                              {result.verdict}
                            </Badge>
                            <span className="text-sm">Detection: {result.detectionRatio}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="hover:bg-accent/20">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">First Seen: {result.firstSeen}</p>
                          <p className="text-muted-foreground">Last Seen: {result.lastSeen}</p>
                        </div>
                        {result.engines.length > 0 && (
                          <div>
                            <p className="text-muted-foreground mb-1">Detected by:</p>
                            <div className="flex flex-wrap gap-1">
                              {result.engines.slice(0, 3).map((engine, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {engine}
                                </Badge>
                              ))}
                              {result.engines.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{result.engines.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mitre-mapping" className="space-y-6">
          <Card className="cyber-card">
            <CardHeader>
              <CardTitle>MITRE ATT&CK Technique Mapping</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Technique</TableHead>
                    <TableHead>MITRE ID</TableHead>
                    <TableHead>Tactic</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Detected In</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockMitreData.map((item, index) => (
                    <TableRow key={index} className="border-border">
                      <TableCell className="font-medium">{item.technique}</TableCell>
                      <TableCell className="font-mono">{item.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-primary text-primary">
                          {item.tactic}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${getSeverityColor(item.severity)}`}>
                          {item.severity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          {item.detectedIn.map((process, i) => (
                            <div key={i} className="font-mono">{process}</div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="hover:bg-accent/20">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ioc-feeds" className="space-y-6">
          <Card className="cyber-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Indicators of Compromise (IOCs)</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" className="border-border">
                    <Server className="h-4 w-4 mr-2" />
                    Configure Feeds
                  </Button>
                  <Button variant="outline" className="border-border">
                    Refresh All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Threat Type</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>First Seen</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockIOCData.map((ioc, index) => (
                    <TableRow key={index} className="border-border">
                      <TableCell>
                        <Badge variant="outline" className={
                          ioc.type === "IP" ? "border-blue-500 text-blue-500" :
                          ioc.type === "Hash" ? "border-purple-500 text-purple-500" :
                          "border-orange-500 text-orange-500"
                        }>
                          {ioc.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{ioc.value}</TableCell>
                      <TableCell>
                        <Badge variant={
                          ioc.threat === "Malware" || ioc.threat === "C2 Server" ? "destructive" : "secondary"
                        }>
                          {ioc.threat}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={getConfidenceColor(ioc.confidence)}>
                          {ioc.confidence}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{ioc.firstSeen}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{ioc.source}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}