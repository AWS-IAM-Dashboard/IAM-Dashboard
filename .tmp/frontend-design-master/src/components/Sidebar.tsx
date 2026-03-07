import { cn } from "./ui/utils";
import { Button } from "./ui/button";
import { 
  LayoutDashboard, 
  Shield, 
  ShieldAlert, 
  Settings as SettingsIcon, 
  FileText, 
  ChevronRight,
  Search,
  Users,
  Server,
  HardDrive,
  Bell
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
  type?: string;
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard }
    ]
  },
  {
    title: "AWS Native Scanners",
    items: [
      { id: "security-hub", label: "Security Hub", icon: Shield },
      { id: "guardduty", label: "GuardDuty", icon: ShieldAlert },
      { id: "config", label: "AWS Config", icon: SettingsIcon },
      { id: "inspector", label: "Inspector", icon: Search },
      { id: "macie", label: "Macie", icon: Shield }
    ]
  },
  {
    title: "Custom OPA Scanners",
    items: [
      { id: "iam-security", label: "IAM Security", icon: Users },
      { id: "ec2-security", label: "EC2 Security", icon: Server },
      { id: "s3-security", label: "S3 Security", icon: HardDrive }
    ]
  },
  {
    title: "Additional",
    items: [
      { id: "security-alerts", label: "Security Alerts", icon: Bell },
      { id: "reports", label: "Reports", icon: FileText },
      { id: "settings", label: "Settings", icon: SettingsIcon }
    ]
  }
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <div className="w-60 bg-sidebar border-r border-sidebar-border/50 h-full relative flex flex-col">
      <div className="flex-1 p-4 pb-4 overflow-y-auto">
        <div className="space-y-6">
          {navGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              {group.title && (
                <div className="px-3 mb-2">
                  <h3 className="text-xs text-muted-foreground uppercase tracking-wider">
                    {group.title}
                  </h3>
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  
                  return (
                    <Button
                      key={item.id}
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-3 h-9 px-3 transition-all duration-200 text-xs",
                        isActive 
                          ? "bg-sidebar-accent/70 text-sidebar-accent-foreground border-l-2 border-primary rounded-r-lg rounded-l-none" 
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground rounded-md"
                      )}
                      onClick={() => onTabChange(item.id)}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span>{item.label}</span>
                      {isActive && <ChevronRight className="h-3 w-3 ml-auto flex-shrink-0" />}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-4 border-t border-sidebar-border/30">
        <div className="cyber-glass p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 bg-primary rounded-full animate-pulse"></div>
            <span className="text-xs text-foreground">System Status</span>
          </div>
          <p className="text-xs text-muted-foreground">All services operational</p>
        </div>
      </div>
    </div>
  );
}