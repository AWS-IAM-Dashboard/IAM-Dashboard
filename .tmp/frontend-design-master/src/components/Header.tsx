import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Search, Bell, Settings, User, LogOut, Shield, Menu, Sun, Moon } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";

interface HeaderProps {
  onNavigate?: (tab: string) => void;
  onMenuClick?: () => void;
  theme?: 'light' | 'dark';
  onThemeToggle?: () => void;
  onLogout?: () => void;
}

const mockNotifications = [
  {
    id: 1,
    type: "Critical",
    title: "Malicious Process Detected",
    description: "High-risk process 'malware.exe' found",
    timestamp: "2 min ago",
    read: false
  },
  {
    id: 2,
    type: "Warning", 
    title: "Suspicious DLL Injection",
    description: "DLL injection detected in svchost.exe",
    timestamp: "15 min ago",
    read: false
  },
  {
    id: 3,
    type: "Info",
    title: "Scan Completed",
    description: "Daily security scan finished successfully",
    timestamp: "1 hour ago",
    read: true
  }
];

export function Header({ onNavigate, onMenuClick, theme = 'dark', onThemeToggle, onLogout }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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
    <header className="h-14 border-b border-border/50 bg-card/30 backdrop-blur-md px-4 md:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden hover:bg-accent/20"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <Shield className="h-5 w-5 text-primary" />
        <div className="hidden sm:block">
          <h1 className="text-base text-foreground">Memory Forensics Toolkit</h1>
          <p className="text-xs text-muted-foreground">Real-time Cyber Threat Detection</p>
        </div>
        <div className="sm:hidden">
          <h1 className="text-sm text-foreground">MFT</h1>
        </div>
      </div>
      
      <div className="flex items-center gap-2 md:gap-4">
        {/* Search */}
        <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-accent/20 hidden sm:flex">
              <Search className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="cyber-card border-border max-w-2xl">
            <DialogHeader>
              <DialogTitle>Global Search</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Search processes, hashes, cases, reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-input border-border"
                autoFocus
              />
              
              {searchTerm && (
                <div className="space-y-4 max-h-96 overflow-auto">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Processes</h4>
                    <div className="space-y-2">
                      <div className="cyber-glass p-3 rounded-lg cursor-pointer hover:bg-accent/10">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm">malware.exe (PID: 6666)</span>
                          <Badge className="bg-[#ff0040] text-white">Dangerous</Badge>
                        </div>
                      </div>
                      <div className="cyber-glass p-3 rounded-lg cursor-pointer hover:bg-accent/10">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm">chrome.exe (PID: 4096)</span>
                          <Badge className="bg-[#00ff88] text-black">Safe</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Cases</h4>
                    <div className="space-y-2">
                      <div className="cyber-glass p-3 rounded-lg cursor-pointer hover:bg-accent/10">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Banking Trojan Investigation</span>
                          <Badge variant="outline">CASE-2024-002</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Reports</h4>
                    <div className="space-y-2">
                      <div className="cyber-glass p-3 rounded-lg cursor-pointer hover:bg-accent/10">
                        <span className="text-sm">Memory Analysis Report - Jan 10</span>
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
                onClick={() => onNavigate?.('automation')}
              >
                View All Alerts
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Theme Toggle */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="hover:bg-accent/20"
          onClick={onThemeToggle}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        {/* Settings */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="hover:bg-accent/20 hidden sm:flex"
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
              <p className="text-sm font-medium">Admin User</p>
              <p className="text-xs text-muted-foreground">admin@forensics.com</p>
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
            
            <DropdownMenuItem 
              className="hover:bg-accent/20 cursor-pointer text-destructive"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}