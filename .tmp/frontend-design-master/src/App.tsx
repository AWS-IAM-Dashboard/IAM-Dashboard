import { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { SecurityHub } from "./components/SecurityHub";
import { GuardDuty } from "./components/GuardDuty";
import { AWSConfig } from "./components/AWSConfig";
import { Inspector } from "./components/Inspector";
import { Macie } from "./components/Macie";
import { AWSIAMScan } from "./components/AWSIAMScan";
import { EC2Security } from "./components/EC2Security";
import { S3Security } from "./components/S3Security";
import { CloudSecurityAlerts } from "./components/CloudSecurityAlerts";
import { Reports } from "./components/Reports";
import { Settings } from "./components/Settings";
import { LandingPage } from "./components/LandingPage";
import { LoginPage } from "./components/LoginPage";
import { AboutPage } from "./components/AboutPage";
import { Toaster } from "./components/ui/sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./components/ui/sheet";
import { useIsMobile } from "./components/ui/use-mobile";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check localStorage for authentication state
    const saved = localStorage.getItem('isAuthenticated');
    return saved === 'true';
  });
  const [showLogin, setShowLogin] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme as 'light' | 'dark') || 'dark';
  });
  const isMobile = useIsMobile();

  useEffect(() => {
    // Apply theme class to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Save to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    // Save authentication state
    localStorage.setItem('isAuthenticated', isAuthenticated.toString());
  }, [isAuthenticated]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    setShowLogin(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
  };

  const handleGetStarted = () => {
    setShowLogin(true);
  };

  const handleShowLogin = () => {
    setShowLogin(true);
  };

  const handleBackToLanding = () => {
    setShowLogin(false);
  };

  const handleShowAbout = () => {
    setShowAbout(true);
  };

  const handleHideAbout = () => {
    setShowAbout(false);
  };

  // Show landing page if not authenticated
  if (!isAuthenticated) {
    if (showAbout) {
      return <AboutPage onBack={handleHideAbout} />;
    }
    if (showLogin) {
      return <LoginPage onBack={handleBackToLanding} onLogin={handleLogin} />;
    }
    return <LandingPage onGetStarted={handleGetStarted} onLogin={handleShowLogin} onAboutClick={handleShowAbout} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard onNavigate={setActiveTab} />;
      case "security-hub":
        return <SecurityHub />;
      case "guardduty":
        return <GuardDuty />;
      case "config":
        return <AWSConfig />;
      case "inspector":
        return <Inspector />;
      case "macie":
        return <Macie />;
      case "iam-security":
        return <AWSIAMScan />;
      case "ec2-security":
        return <EC2Security />;
      case "s3-security":
        return <S3Security />;
      case "security-alerts":
        return <CloudSecurityAlerts />;
      case "reports":
        return <Reports />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header 
        onNavigate={setActiveTab} 
        onMenuClick={() => setMobileMenuOpen(true)}
        theme={theme}
        onThemeToggle={toggleTheme}
        onLogout={handleLogout}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
        
        {/* Mobile Drawer */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="bg-sidebar border-sidebar-border/50 p-0 w-64">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
              <SheetDescription>Navigate between different sections of the application</SheetDescription>
            </SheetHeader>
            <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
          </SheetContent>
        </Sheet>
        
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>
      <Toaster 
        position="top-right"
        theme={theme}
        toastOptions={{
          style: theme === 'dark' 
            ? {
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(0, 255, 136, 0.3)',
                color: '#e2e8f0',
              }
            : {
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid rgba(0, 102, 255, 0.3)',
                color: '#0a1929',
              },
        }}
      />
    </div>
  );
}