import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { GitBranch, ZoomIn, ZoomOut, RotateCcw, Search, Filter, Maximize2 } from "lucide-react";

// Mock process tree data
const mockProcessTree = {
  pid: 0,
  name: "System",
  status: "Safe",
  riskScore: 0,
  startTime: "System Boot",
  children: [
    {
      pid: 4,
      name: "System",
      status: "Safe", 
      riskScore: 5,
      startTime: "09:00:01",
      children: [
        {
          pid: 512,
          name: "smss.exe",
          status: "Safe",
          riskScore: 2,
          startTime: "09:00:02",
          children: []
        },
        {
          pid: 1024,
          name: "csrss.exe",
          status: "Safe",
          riskScore: 8,
          startTime: "09:00:03",
          children: [
            {
              pid: 2048,
              name: "explorer.exe",
              status: "Safe",
              riskScore: 12,
              startTime: "09:01:15",
              children: [
                {
                  pid: 4096,
                  name: "chrome.exe",
                  status: "Safe",
                  riskScore: 15,
                  startTime: "10:30:22",
                  children: [
                    {
                      pid: 8192,
                      name: "chrome.exe",
                      status: "Safe",
                      riskScore: 10,
                      startTime: "10:30:25",
                      children: []
                    }
                  ]
                },
                {
                  pid: 6666,
                  name: "malware.exe",
                  status: "Danger",
                  riskScore: 95,
                  startTime: "14:22:30",
                  children: [
                    {
                      pid: 7777,
                      name: "injected.dll",
                      status: "Suspicious",
                      riskScore: 87,
                      startTime: "14:22:31",
                      children: []
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          pid: 1337,
          name: "svchost.exe",
          status: "Suspicious",
          riskScore: 78,
          startTime: "09:00:05",
          children: [
            {
              pid: 2222,
              name: "hidden.exe",
              status: "Danger",
              riskScore: 99,
              startTime: "11:45:12",
              children: []
            }
          ]
        }
      ]
    }
  ]
};

interface ProcessNodeProps {
  process: any;
  level: number;
  onNodeClick: (process: any) => void;
  expandedNodes: Set<number>;
  onToggleExpand: (pid: number) => void;
}

function ProcessNode({ process, level, onNodeClick, expandedNodes, onToggleExpand }: ProcessNodeProps) {
  const isExpanded = expandedNodes.has(process.pid);
  const hasChildren = process.children && process.children.length > 0;
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Safe": return "text-[#00ff88]";
      case "Suspicious": return "text-[#ffb000]";
      case "Danger": return "text-[#ff0040]";
      default: return "text-muted-foreground";
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return "text-[#ff0040]";
    if (score >= 50) return "text-[#ffb000]";
    return "text-[#00ff88]";
  };

  return (
    <div className="select-none">
      <div className="flex items-center gap-2 py-1 group hover:bg-accent/10 rounded px-2" style={{ marginLeft: `${level * 24}px` }}>
        {hasChildren && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-accent/20"
            onClick={() => onToggleExpand(process.pid)}
          >
            <span className="text-xs">{isExpanded ? "−" : "+"}</span>
          </Button>
        )}
        {!hasChildren && <div className="w-6" />}
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className="flex items-center gap-2 cursor-pointer flex-1"
                onClick={() => onNodeClick(process)}
              >
                <div className={`w-2 h-2 rounded-full ${
                  process.status === "Safe" ? "bg-[#00ff88]" :
                  process.status === "Suspicious" ? "bg-[#ffb000]" :
                  "bg-[#ff0040]"
                }`} />
                <span className="font-mono text-sm">{process.name}</span>
                <span className="text-xs text-muted-foreground">({process.pid})</span>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getStatusColor(process.status)} border-current`}
                >
                  {process.status}
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent className="cyber-glass border-border">
              <div className="space-y-1">
                <p><strong>Process:</strong> {process.name}</p>
                <p><strong>PID:</strong> {process.pid}</p>
                <p><strong>Status:</strong> <span className={getStatusColor(process.status)}>{process.status}</span></p>
                <p><strong>Risk Score:</strong> <span className={getRiskColor(process.riskScore)}>{process.riskScore}</span></p>
                <p><strong>Start Time:</strong> {process.startTime}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {hasChildren && isExpanded && (
        <div>
          {process.children.map((child: any) => (
            <ProcessNode
              key={child.pid}
              process={child}
              level={level + 1}
              onNodeClick={onNodeClick}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ProcessTree() {
  const [selectedProcess, setSelectedProcess] = useState<any>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set([0, 4, 1024, 2048]));
  const [searchTerm, setSearchTerm] = useState("");
  const [zoom, setZoom] = useState(100);
  const treeRef = useRef<HTMLDivElement>(null);

  const toggleExpand = (pid: number) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(pid)) {
      newExpanded.delete(pid);
    } else {
      newExpanded.add(pid);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    const getAllPids = (process: any): number[] => {
      let pids = [process.pid];
      if (process.children) {
        process.children.forEach((child: any) => {
          pids = pids.concat(getAllPids(child));
        });
      }
      return pids;
    };
    setExpandedNodes(new Set(getAllPids(mockProcessTree)));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set([0]));
  };

  const zoomIn = () => setZoom(Math.min(zoom + 25, 200));
  const zoomOut = () => setZoom(Math.max(zoom - 25, 50));
  const resetZoom = () => setZoom(100);

  return (
    <div className="p-6 space-y-6">
      {/* Controls */}
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Process Tree Visualization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search processes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-input border-border w-64"
                />
              </div>
              <Button variant="outline" className="border-border">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 border border-border rounded-md p-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm px-2 min-w-[3rem] text-center">{zoom}%</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetZoom}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
              
              <Button variant="outline" className="border-border" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="outline" className="border-border" onClick={collapseAll}>
                Collapse All
              </Button>
              <Button variant="outline" className="border-border">
                <Maximize2 className="h-4 w-4 mr-2" />
                Fullscreen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Process Tree */}
        <Card className="cyber-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Process Hierarchy</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              ref={treeRef}
              className="overflow-auto max-h-[600px] cyber-glass p-4 rounded-lg"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
            >
              <ProcessNode
                process={mockProcessTree}
                level={0}
                onNodeClick={setSelectedProcess}
                expandedNodes={expandedNodes}
                onToggleExpand={toggleExpand}
              />
            </div>
          </CardContent>
        </Card>

        {/* Process Details */}
        <Card className="cyber-card">
          <CardHeader>
            <CardTitle>Process Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedProcess ? (
              <div className="space-y-4">
                <div className="cyber-glass p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-3 h-3 rounded-full ${
                      selectedProcess.status === "Safe" ? "bg-[#00ff88]" :
                      selectedProcess.status === "Suspicious" ? "bg-[#ffb000]" :
                      "bg-[#ff0040]"
                    }`} />
                    <h4 className="font-medium">{selectedProcess.name}</h4>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">PID:</span>
                      <span className="font-mono">{selectedProcess.pid}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge className={
                        selectedProcess.status === "Safe" ? "bg-[#00ff88] text-black" :
                        selectedProcess.status === "Suspicious" ? "bg-[#ffb000] text-black" :
                        "bg-[#ff0040] text-white"
                      }>
                        {selectedProcess.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Risk Score:</span>
                      <span className={
                        selectedProcess.riskScore >= 80 ? "text-[#ff0040]" :
                        selectedProcess.riskScore >= 50 ? "text-[#ffb000]" :
                        "text-[#00ff88]"
                      }>
                        {selectedProcess.riskScore}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Start Time:</span>
                      <span className="font-mono text-xs">{selectedProcess.startTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Children:</span>
                      <span>{selectedProcess.children?.length || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/80">
                    Analyze Process
                  </Button>
                  <Button variant="outline" className="w-full border-border">
                    View Memory
                  </Button>
                  <Button variant="outline" className="w-full border-border">
                    Kill Process
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Click on a process in the tree to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle>Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#00ff88]" />
              <span className="text-sm">Safe Process</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ffb000]" />
              <span className="text-sm">Suspicious Process</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ff0040]" />
              <span className="text-sm">Dangerous Process</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}