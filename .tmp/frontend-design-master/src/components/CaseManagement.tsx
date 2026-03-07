import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Briefcase, Plus, Eye, Download, Upload, FileText, Clock, User, AlertTriangle } from "lucide-react";

const mockCases = [
  {
    id: "CASE-2024-001",
    title: "Suspicious Process Detection - Chrome Hijack",
    status: "Open",
    priority: "High", 
    assignee: "Alice Johnson",
    createdDate: "2024-01-10",
    lastUpdated: "2024-01-10 14:30",
    threatsFound: 5,
    evidenceCount: 3
  },
  {
    id: "CASE-2024-002", 
    title: "Memory Dump Analysis - Banking Trojan",
    status: "In Progress",
    priority: "Critical",
    assignee: "Bob Smith",
    createdDate: "2024-01-09",
    lastUpdated: "2024-01-10 12:15",
    threatsFound: 12,
    evidenceCount: 7
  },
  {
    id: "CASE-2024-003",
    title: "DLL Injection Investigation",
    status: "Closed",
    priority: "Medium",
    assignee: "Carol Davis",
    createdDate: "2024-01-08",
    lastUpdated: "2024-01-09 16:45",
    threatsFound: 3,
    evidenceCount: 2
  }
];

const mockAuditLog = [
  {
    id: 1,
    timestamp: "2024-01-10 14:30:22",
    user: "Alice Johnson",
    action: "Case Created",
    details: "Created new case CASE-2024-001",
    caseId: "CASE-2024-001"
  },
  {
    id: 2,
    timestamp: "2024-01-10 14:25:15",
    user: "Bob Smith", 
    action: "Evidence Added",
    details: "Uploaded memory dump file (2.3GB)",
    caseId: "CASE-2024-002"
  },
  {
    id: 3,
    timestamp: "2024-01-10 12:15:30",
    user: "Carol Davis",
    action: "Case Updated",
    details: "Changed status to Closed, added final report",
    caseId: "CASE-2024-003"
  },
  {
    id: 4,
    timestamp: "2024-01-10 11:45:12",
    user: "Alice Johnson",
    action: "Analysis Run",
    details: "Executed hidden process detection scan",
    caseId: "CASE-2024-001"
  }
];

const mockEvidence = [
  {
    id: 1,
    name: "memory_dump_01.dmp",
    type: "Memory Dump",
    size: "2.3 GB",
    uploadDate: "2024-01-10 14:22",
    hash: "a1b2c3d4e5f6...",
    status: "Verified"
  },
  {
    id: 2,
    name: "process_list.json",
    type: "Process Data",
    size: "156 KB", 
    uploadDate: "2024-01-10 14:25",
    hash: "f6e5d4c3b2a1...",
    status: "Verified"
  },
  {
    id: 3,
    name: "network_logs.txt",
    type: "Network Log",
    size: "89 KB",
    uploadDate: "2024-01-10 14:28",
    hash: "9876543210ab...",
    status: "Pending"
  }
];

export function CaseManagement() {
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState("");
  const [newCaseDescription, setNewCaseDescription] = useState("");
  const [newCasePriority, setNewCasePriority] = useState("");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open": return "bg-[#0ea5e9] text-white";
      case "In Progress": return "bg-[#ffb000] text-black";
      case "Closed": return "bg-[#00ff88] text-black";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical": return "text-[#ff0040]";
      case "High": return "text-[#ff6b40]";
      case "Medium": return "text-[#ffb000]";
      case "Low": return "text-[#00ff88]";
      default: return "text-muted-foreground";
    }
  };

  const createCase = () => {
    // Mock case creation
    setShowCreateDialog(false);
    setNewCaseTitle("");
    setNewCaseDescription("");
    setNewCasePriority("");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Case Overview */}
      <Card className="cyber-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Case Management Dashboard
            </CardTitle>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/80 cyber-glow">
                  <Plus className="h-4 w-4 mr-2" />
                  New Case
                </Button>
              </DialogTrigger>
              <DialogContent className="cyber-card border-border">
                <DialogHeader>
                  <DialogTitle>Create New Case</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="case-title">Case Title</Label>
                    <Input
                      id="case-title"
                      value={newCaseTitle}
                      onChange={(e) => setNewCaseTitle(e.target.value)}
                      placeholder="Enter case title..."
                      className="bg-input border-border"
                    />
                  </div>
                  <div>
                    <Label htmlFor="case-description">Description</Label>
                    <Textarea
                      id="case-description"
                      value={newCaseDescription}
                      onChange={(e) => setNewCaseDescription(e.target.value)}
                      placeholder="Enter case description..."
                      className="bg-input border-border"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={newCasePriority} onValueChange={setNewCasePriority}>
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={createCase} className="flex-1 bg-primary text-primary-foreground">
                      Create Case
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1 border-border">
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="cyber-glass p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Total Cases</span>
              </div>
              <p className="text-2xl font-medium">{mockCases.length}</p>
            </div>
            
            <div className="cyber-glass p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-[#ff0040]" />
                <span className="text-sm text-muted-foreground">Open Cases</span>
              </div>
              <p className="text-2xl font-medium text-[#ff0040]">
                {mockCases.filter(c => c.status === "Open").length}
              </p>
            </div>
            
            <div className="cyber-glass p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-[#ffb000]" />
                <span className="text-sm text-muted-foreground">In Progress</span>
              </div>
              <p className="text-2xl font-medium text-[#ffb000]">
                {mockCases.filter(c => c.status === "In Progress").length}
              </p>
            </div>
            
            <div className="cyber-glass p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">My Cases</span>
              </div>
              <p className="text-2xl font-medium">2</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="cases" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-card border border-border">
          <TabsTrigger value="cases" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Active Cases
          </TabsTrigger>
          <TabsTrigger value="evidence" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Evidence
          </TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="space-y-6">
          <Card className="cyber-card">
            <CardHeader>
              <CardTitle>Case List</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Case ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Threats</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockCases.map((case_) => (
                    <TableRow key={case_.id} className="border-border">
                      <TableCell className="font-mono">{case_.id}</TableCell>
                      <TableCell className="font-medium max-w-xs truncate">{case_.title}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(case_.status)}>
                          {case_.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${getPriorityColor(case_.priority)}`}>
                          {case_.priority}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{case_.assignee}</TableCell>
                      <TableCell>
                        <span className={case_.threatsFound > 5 ? "text-[#ff0040]" : "text-[#ffb000]"}>
                          {case_.threatsFound}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{case_.lastUpdated}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-accent/20"
                            onClick={() => setSelectedCase(case_)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent/20">
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

          {selectedCase && (
            <Card className="cyber-card">
              <CardHeader>
                <CardTitle>Case Details - {selectedCase.id}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label>Case Title</Label>
                      <p className="text-sm mt-1">{selectedCase.title}</p>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <div className="mt-1">
                        <Badge className={getStatusColor(selectedCase.status)}>
                          {selectedCase.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <p className={`text-sm mt-1 ${getPriorityColor(selectedCase.priority)}`}>
                        {selectedCase.priority}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Assigned Analyst</Label>
                      <p className="text-sm mt-1">{selectedCase.assignee}</p>
                    </div>
                    <div>
                      <Label>Created Date</Label>
                      <p className="text-sm mt-1 font-mono">{selectedCase.createdDate}</p>
                    </div>
                    <div>
                      <Label>Evidence Files</Label>
                      <p className="text-sm mt-1">{selectedCase.evidenceCount} files attached</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 space-y-4">
                  <Label>Case Notes</Label>
                  <Textarea
                    placeholder="Add case notes..."
                    className="bg-input border-border"
                    rows={4}
                  />
                  <div className="flex gap-2">
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/80">
                      Update Case
                    </Button>
                    <Button variant="outline" className="border-border">
                      <Upload className="h-4 w-4 mr-2" />
                      Add Evidence
                    </Button>
                    <Button variant="outline" className="border-border">
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="evidence" className="space-y-6">
          <Card className="cyber-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Evidence Management</CardTitle>
                <Button variant="outline" className="border-border">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Evidence
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>File Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Upload Date</TableHead>
                    <TableHead>Hash (SHA256)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockEvidence.map((evidence) => (
                    <TableRow key={evidence.id} className="border-border">
                      <TableCell className="font-mono">{evidence.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-primary text-primary">
                          {evidence.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{evidence.size}</TableCell>
                      <TableCell className="font-mono text-xs">{evidence.uploadDate}</TableCell>
                      <TableCell className="font-mono text-xs">{evidence.hash}</TableCell>
                      <TableCell>
                        <Badge className={evidence.status === "Verified" ? "bg-[#00ff88] text-black" : "bg-[#ffb000] text-black"}>
                          {evidence.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent/20">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent/20">
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
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <Card className="cyber-card">
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Case ID</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockAuditLog.map((log) => (
                    <TableRow key={log.id} className="border-border">
                      <TableCell className="font-mono text-xs">{log.timestamp}</TableCell>
                      <TableCell>{log.user}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-border">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{log.caseId}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{log.details}</TableCell>
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