import { cn } from "./ui/utils";
import { Button } from "./ui/button";
import { 
  LayoutDashboard, 
  Shield, 
  Cloud, 
  Database, 
  HardDrive,
  Network,
  Zap,
  Users,
  FileText, 
  Settings,
  ChevronRight,
  BarChart3,
  AlertTriangle,
  Lock,
  Activity,
  DollarSign,
  Monitor,
  Search,
  Eye,
  BadgeCheck,
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: "dashboard", label: "Security Overview", icon: LayoutDashboard },
  { id: "separator-free", label: "Free Tier", icon: null, type: "section-header" },
  { id: "iam-security", label: "IAM & Access Control", icon: Users },
  { id: "access-analyzer", label: "Access Analyzer", icon: BadgeCheck },
  { id: "ec2-security", label: "EC2 & Compute", icon: Cloud },
  { id: "s3-security", label: "S3 & Storage", icon: HardDrive },
  { id: "vpc-security", label: "VPC & Network", icon: Network },
  { id: "dynamodb-security", label: "DynamoDB", icon: Database },
  { id: "separator-scanners", label: "", icon: null, type: "separator" },
  { id: "separator-paid", label: "Paid Services", icon: null, type: "section-header" },
  { id: "security-hub", label: "Security Hub", icon: Shield },
  { id: "guardduty", label: "GuardDuty", icon: AlertTriangle },
  { id: "config", label: "Config", icon: Settings },
  { id: "inspector", label: "Inspector", icon: Search },
  { id: "macie", label: "Macie", icon: Eye },
  { id: "separator-other", label: "", icon: null, type: "separator" },
  { id: "alerts", label: "Security Alerts", icon: AlertTriangle },
  { id: "compliance", label: "Compliance Dashboard", icon: Shield },
  { id: "reports", label: "Security Reports", icon: FileText },
  { id: "grafana", label: "Grafana Integration", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border h-full flex flex-col">
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => {
            if (item.type === "separator") {
              return (
                <div key={item.id} className="px-3 py-2">
                  <div className="h-px bg-sidebar-border"></div>
                </div>
              );
            }
            if (item.type === "section-header" && item.label) {
              return (
                <div key={item.id} className="px-3 pt-4 pb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {item.label}
                  </span>
                </div>
              );
            }
            
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 h-11 px-3 transition-all duration-200",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border cyber-glow" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
                onClick={() => onTabChange(item.id)}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm">{item.label}</span>
                {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
              </Button>
            );
          })}
        </div>
      </div>
      
      <div className="p-6 pt-0 border-t border-sidebar-border">
        <div className="cyber-glass p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 bg-primary rounded-full animate-pulse"></div>
            <span className="text-xs text-foreground">System Status</span>
          </div>
          <p className="text-xs text-muted-foreground">All services operational</p>
        </div>
      </div>
    </div>
  );
}