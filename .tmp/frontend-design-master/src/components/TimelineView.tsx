import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Clock, Filter, Calendar, ZoomIn, ZoomOut, Play, Pause } from "lucide-react";

const mockTimelineEvents = [
  {
    id: 1,
    timestamp: "09:00:01",
    type: "Process Start",
    process: "system.exe",
    pid: 4,
    status: "Safe",
    description: "System process started",
    details: "Core system process initialization"
  },
  {
    id: 2,
    timestamp: "09:00:02",
    type: "Process Start", 
    process: "smss.exe",
    pid: 512,
    status: "Safe",
    description: "Session Manager started",
    details: "Windows Session Manager Subsystem"
  },
  {
    id: 3,
    timestamp: "09:00:03",
    type: "Process Start",
    process: "csrss.exe", 
    pid: 1024,
    status: "Safe",
    description: "Client/Server Runtime started",
    details: "Windows subsystem server process"
  },
  {
    id: 4,
    timestamp: "09:01:15",
    type: "Process Start",
    process: "explorer.exe",
    pid: 2048,
    status: "Safe", 
    description: "Windows Explorer started",
    details: "Windows shell and file manager"
  },
  {
    id: 5,
    timestamp: "10:30:22",
    type: "Process Start",
    process: "chrome.exe",
    pid: 4096,
    status: "Safe",
    description: "Chrome browser started",
    details: "User initiated browser launch"
  },
  {
    id: 6,
    timestamp: "11:45:12",
    type: "Process Start",
    process: "hidden.exe",
    pid: 2222,
    status: "Danger",
    description: "Suspicious process detected",
    details: "Process attempting to hide from system"
  },
  {
    id: 7,
    timestamp: "14:22:30",
    type: "Process Start",
    process: "malware.exe",
    pid: 6666,
    status: "Danger",
    description: "Malicious process started",
    details: "High-risk executable detected"
  },
  {
    id: 8,
    timestamp: "14:22:31",
    type: "DLL Injection",
    process: "injected.dll",
    pid: 7777,
    status: "Suspicious",
    description: "DLL injection detected",
    details: "Suspicious DLL injected into process space"
  },
  {
    id: 9,
    timestamp: "14:23:45",
    type: "Process Terminate",
    process: "chrome.exe",
    pid: 4096,
    status: "Safe",
    description: "Chrome browser terminated",
    details: "User closed browser application"
  },
  {
    id: 10,
    timestamp: "15:30:12",
    type: "Network Connection",
    process: "malware.exe",
    pid: 6666,
    status: "Danger",
    description: "Suspicious network activity",
    details: "Connection to known C2 server: 192.168.1.100"
  }
];

export function TimelineView() {
  const [selectedTimeRange, setSelectedTimeRange] = useState("all");
  const [processTypeFilter, setProcessTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "Process Start": return "border-l-[#00ff88]";
      case "Process Terminate": return "border-l-[#ff6b40]";
      case "DLL Injection": return "border-l-[#8b5cf6]";
      case "Network Connection": return "border-l-[#0ea5e9]";
      default: return "border-l-muted";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Safe": return "bg-[#00ff88] text-black";
      case "Suspicious": return "bg-[#ffb000] text-black";
      case "Danger": return "bg-[#ff0040] text-white";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const filteredEvents = mockTimelineEvents.filter(event => {
    if (statusFilter !== "all" && event.status.toLowerCase() !== statusFilter) return false;
    if (searchTerm && !event.process.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const timeRanges = [
    { value: "all", label: "All Time" },
    { value: "1h", label: "Last Hour" },
    { value: "6h", label: "Last 6 Hours" },
    { value: "24h", label: "Last 24 Hours" },
    { value: "custom", label: "Custom Range" }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Timeline Controls */}
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Timeline Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label>Time Range</Label>
              <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeRanges.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Status Filter</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="safe">Safe Only</SelectItem>
                  <SelectItem value="suspicious">Suspicious Only</SelectItem>
                  <SelectItem value="danger">Dangerous Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Search Process</Label>
              <Input
                placeholder="Filter by process name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-input border-border"
              />
            </div>
            
            <div>
              <Label>Playback Controls</Label>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="border-border"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <div className="flex items-center gap-1 border border-border rounded-md p-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => setZoomLevel(Math.max(50, zoomLevel - 25))}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm px-2 min-w-[3rem] text-center">{zoomLevel}%</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cyber-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#00ff88]" />
              <span className="text-sm text-muted-foreground">Safe Events</span>
            </div>
            <p className="text-2xl font-medium mt-1">
              {filteredEvents.filter(e => e.status === "Safe").length}
            </p>
          </CardContent>
        </Card>
        
        <Card className="cyber-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#ffb000]" />
              <span className="text-sm text-muted-foreground">Suspicious Events</span>
            </div>
            <p className="text-2xl font-medium mt-1">
              {filteredEvents.filter(e => e.status === "Suspicious").length}
            </p>
          </CardContent>
        </Card>
        
        <Card className="cyber-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#ff0040]" />
              <span className="text-sm text-muted-foreground">Dangerous Events</span>
            </div>
            <p className="text-2xl font-medium mt-1">
              {filteredEvents.filter(e => e.status === "Danger").length}
            </p>
          </CardContent>
        </Card>
        
        <Card className="cyber-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Events</span>
            </div>
            <p className="text-2xl font-medium mt-1">{filteredEvents.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Events */}
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle>Process Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            
            {/* Timeline events */}
            <div className="space-y-4" style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left' }}>
              {filteredEvents.map((event, index) => (
                <div key={event.id} className={`relative border-l-4 ${getEventTypeColor(event.type)} bg-card/50 backdrop-blur-sm rounded-r-lg ml-4 pl-4`}>
                  {/* Timeline dot */}
                  <div className="absolute -left-[7px] top-4 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                  
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-muted-foreground">{event.timestamp}</span>
                        <Badge variant="outline" className="text-xs">
                          {event.type}
                        </Badge>
                        <Badge className={getStatusColor(event.status)}>
                          {event.status}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs hover:bg-accent/20">
                        Details
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{event.process}</span>
                        <span className="text-sm text-muted-foreground">PID: {event.pid}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                      <p className="text-xs text-muted-foreground italic">{event.details}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Type Legend */}
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle>Event Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-[#00ff88]" />
              <span className="text-sm">Process Start</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-[#ff6b40]" />
              <span className="text-sm">Process Terminate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-[#8b5cf6]" />
              <span className="text-sm">DLL Injection</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-[#0ea5e9]" />
              <span className="text-sm">Network Connection</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}