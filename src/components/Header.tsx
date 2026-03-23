import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Search, Bell, Settings, User, LogOut, Shield } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";

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
  const auth = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const profile = auth.user?.profile;
  const userEmail = typeof profile?.email === "string" ? profile.email : "Authenticated User";
  const displayName =
    (typeof profile?.name === "string" && profile.name) ||
    (typeof profile?.preferred_username === "string" && profile.preferred_username) ||
    userEmail;
  const initials = displayName
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AU";

  const handleSignOut = async () => {
    auth.signOut();
    window.location.assign("/login");
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
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="text-2xl">☁️</div>
        <div>
          <h1 className="text-lg font-medium text-foreground">AWS Cloud Security Dashboard</h1>
          <p className="text-xs text-muted-foreground">Real-time Cloud Misconfiguration Detection</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Search */}
        <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-accent/20">
              <Search className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="cyber-card border-border max-w-2xl">
            <DialogHeader>
              <DialogTitle>Global Search</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Search AWS resources, policies, security groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-input border-border"
                autoFocus
              />
              
              {searchTerm && (
                <div className="space-y-4 max-h-96 overflow-auto">
                  <div>
                    <h4 className="text-sm font-medium mb-2">AWS Resources</h4>
                    <div className="space-y-2">
                      <div className="cyber-glass p-3 rounded-lg cursor-pointer hover:bg-accent/10">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm">i-0abcd1234efgh5678 (EC2)</span>
                          <Badge className="bg-[#ff0040] text-white">High Risk</Badge>
                        </div>
                      </div>
                      <div className="cyber-glass p-3 rounded-lg cursor-pointer hover:bg-accent/10">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm">company-backups (S3)</span>
                          <Badge className="bg-[#ffb000] text-black">Medium Risk</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Security Findings</h4>
                    <div className="space-y-2">
                      <div className="cyber-glass p-3 rounded-lg cursor-pointer hover:bg-accent/10">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">IAM Root Access Keys Active</span>
                          <Badge variant="outline">SEC-2024-001</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Compliance Reports</h4>
                    <div className="space-y-2">
                      <div className="cyber-glass p-3 rounded-lg cursor-pointer hover:bg-accent/10">
                        <span className="text-sm">CIS AWS Foundations Report - Oct 5</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

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
                <AvatarFallback className="bg-secondary text-xs">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="cyber-card border-border w-64" align="end">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
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
            
            <DropdownMenuItem className="hover:bg-accent/20 cursor-pointer text-destructive" onClick={() => void handleSignOut()}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
