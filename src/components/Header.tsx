import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Search, Bell, Settings, User, LogOut, Shield } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useActiveScanResults } from "../hooks/useActiveScanResults";
import { AwsAccountSwitcher } from "./AwsAccountSwitcher";

interface HeaderProps {
  onNavigate?: (tab: string) => void;
}

const mockNotifications = [
  {
    id: 1,
    type: "Critical",
    title: "S3 Bucket Publicly Accessible",
    description: "Bucket 'company-backups' has public read access",
    timestamp: "2 min ago",
    read: false
  },
  {
    id: 2,
    type: "Warning", 
    title: "EC2 Security Group Misconfigured",
    description: "Security group allows SSH from 0.0.0.0/0",
    timestamp: "15 min ago",
    read: false
  },
  {
    id: 3,
    type: "Info",
    title: "IAM Compliance Scan Completed",
    description: "Daily AWS security scan finished successfully",
    timestamp: "1 hour ago",
    read: true
  }
];

export function Header({ onNavigate }: HeaderProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const { getAllScanResults, scanResultsVersion } = useActiveScanResults();

  const tabSearchItems = useMemo(() => [
    { id: "dashboard", label: "Security Overview", category: "Tab", tab: "dashboard", keywords: ["overview", "dashboard", "home"] },
    { id: "iam-security", label: "IAM & Access Control", category: "Tab", tab: "iam-security", keywords: ["iam", "access", "identity", "users"] },
    { id: "access-analyzer", label: "Access Analyzer", category: "Tab", tab: "access-analyzer", keywords: ["access analyzer", "cross-account"] },
    { id: "ec2-security", label: "EC2 & Compute", category: "Tab", tab: "ec2-security", keywords: ["ec2", "compute"] },
    { id: "s3-security", label: "S3 & Storage", category: "Tab", tab: "s3-security", keywords: ["s3", "storage", "bucket"] },
    { id: "vpc-security", label: "VPC & Network", category: "Tab", tab: "vpc-security", keywords: ["vpc", "network"] },
    { id: "dynamodb-security", label: "DynamoDB", category: "Tab", tab: "dynamodb-security", keywords: ["dynamodb", "database"] },
    { id: "security-hub", label: "Security Hub", category: "Tab", tab: "security-hub", keywords: ["security hub"] },
    { id: "guardduty", label: "GuardDuty", category: "Tab", tab: "guardduty", keywords: ["guardduty"] },
    { id: "config", label: "Config", category: "Tab", tab: "config", keywords: ["config"] },
    { id: "inspector", label: "Inspector", category: "Tab", tab: "inspector", keywords: ["inspector"] },
    { id: "macie", label: "Macie", category: "Tab", tab: "macie", keywords: ["macie"] },
    { id: "alerts", label: "Security Alerts", category: "Tab", tab: "alerts", keywords: ["alerts", "findings"] },
    { id: "compliance", label: "Compliance Dashboard", category: "Tab", tab: "compliance", keywords: ["compliance", "framework"] },
    { id: "reports", label: "Security Reports", category: "Tab", tab: "reports", keywords: ["reports"] },
    { id: "grafana", label: "Grafana Integration", category: "Tab", tab: "grafana", keywords: ["grafana", "charts"] },
    { id: "settings", label: "Settings", category: "Tab", tab: "settings", keywords: ["settings", "configuration"] },
  ], []);

  const scanResults = useMemo(() => getAllScanResults(), [scanResultsVersion, getAllScanResults]);
  const findingSearchItems = useMemo(() => {
    const scannerTabMap: Record<string, string> = {
      iam: "iam-security",
      "security-hub": "security-hub",
      guardduty: "guardduty",
      config: "config",
      inspector: "inspector",
      macie: "macie",
      ec2: "ec2-security",
      s3: "s3-security",
      vpc: "vpc-security",
      dynamodb: "dynamodb-security",
      full: "alerts",
    };

    return scanResults
      .flatMap((scan) => (scan.findings ?? []).map((finding: any, index: number) => {
        const id = finding.id || `${scan.scanner_type}-${scan.scan_id}-${index}`;
        const resource = finding.resource_name || finding.resource_id || finding.resource_arn || "Unknown resource";
        const title = finding.finding_type || finding.title || "Security finding";
        const severity = (finding.severity || "Medium").toString();
        const targetTab = scannerTabMap[scan.scanner_type] || "alerts";

        return {
          id: `${scan.scan_id}-${scan.scanner_type}-${id}-${index}`,
          findingId: id,
          label: `${title} (${resource})`,
          category: "Finding",
          tab: targetTab,
          keywords: [
            id,
            resource,
            title,
            finding.description || "",
            finding.resource_arn || "",
            severity,
          ],
          badge: severity,
        };
      }))
      .slice(0, 100);
  }, [scanResults]);

  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];

    const allItems = [...tabSearchItems, ...findingSearchItems];
    return allItems
      .filter((item) => {
        const haystack = `${item.label} ${item.category} ${item.keywords.join(" ")}`.toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 8);
  }, [searchTerm, tabSearchItems, findingSearchItems]);

  // Close dropdown when clicking anywhere outside the search container
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setSearchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navigateFromSearch = (tab: string) => {
    onNavigate?.(tab);
    setSearchTerm("");
    setSearchDropdownOpen(false);
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "Critical": return "bg-[#ff0040] text-white";
      case "Warning": return "bg-[#ffb000] text-black";
      case "Info": return "bg-[#0ea5e9] text-white";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const unreadCount = mockNotifications.filter(n => !n.read).length;

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md px-6 flex items-center justify-between relative z-30">
      <div className="flex items-center gap-3">
        <div className="text-2xl">☁️</div>
        <div>
          <h1 className="text-lg font-medium text-foreground">AWS Cloud Security Dashboard</h1>
          <p className="text-xs text-muted-foreground">Real-time Cloud Misconfiguration Detection</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <AwsAccountSwitcher />

        {/* Search */}
        <div
          ref={searchContainerRef}
          className="relative w-[340px]"
        >
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search tabs, findings, and resources..."
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setSearchDropdownOpen(true);
            }}
            onFocus={() => setSearchDropdownOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && searchResults.length > 0) {
                navigateFromSearch(searchResults[0].tab);
              }
            }}
            className="bg-input border-border pl-9"
          />
          {searchDropdownOpen && searchTerm.trim() && (
            <div className="absolute z-50 mt-2 w-full rounded-lg border border-border bg-card/100 shadow-lg max-h-[320px] overflow-auto">
              {searchResults.length > 0 ? (
                searchResults.map((item) => (
                  <div
                    key={`${item.category}-${item.id}`}
                    role="button"
                    className="w-full text-left px-3 py-2 bg-muted/40 hover:bg-accent/40 border-b border-border last:border-b-0 cursor-pointer"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      navigateFromSearch(item.tab);
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm truncate">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                        {"badge" in item && item.badge ? (
                          <Badge className="text-[10px]">{item.badge}</Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-3 py-3 text-sm text-muted-foreground">
                  No matches. Try another keyword.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-accent/20 relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-primary-foreground">{unreadCount}</span>
                </div>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="cyber-card border-border w-80 p-0" align="end">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Notifications</h4>
                <Badge variant="outline" className="text-xs">
                  {unreadCount} new
                </Badge>
              </div>
            </div>
            <div className="max-h-96 overflow-auto">
              {mockNotifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`p-4 border-b border-border hover:bg-accent/10 cursor-pointer ${
                    !notification.read ? 'bg-accent/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={getNotificationColor(notification.type)} size="sm">
                          {notification.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{notification.timestamp}</span>
                      </div>
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs text-muted-foreground">{notification.description}</p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-border">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-border"
                onClick={() => onNavigate?.('alerts')}
              >
                View All Alerts
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Settings */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="hover:bg-accent/20"
          onClick={() => onNavigate?.('settings')}
        >
          <Settings className="h-4 w-4" />
        </Button>

        {/* Profile Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src="" />
                <AvatarFallback className="bg-secondary text-xs">AD</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="cyber-card border-border w-64" align="end">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-sm font-medium">Cloud Security Admin</p>
              <p className="text-xs text-muted-foreground">admin@cloudsec.com</p>
            </div>
            
            <DropdownMenuItem className="hover:bg-accent/20 cursor-pointer">
              <User className="h-4 w-4 mr-2" />
              Profile Settings
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              className="hover:bg-accent/20 cursor-pointer"
              onClick={() => onNavigate?.('settings')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Application Settings
            </DropdownMenuItem>
            
            <DropdownMenuItem className="hover:bg-accent/20 cursor-pointer">
              <Shield className="h-4 w-4 mr-2" />
              Security Options
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="bg-border" />
            
            <DropdownMenuItem className="hover:bg-accent/20 cursor-pointer text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}