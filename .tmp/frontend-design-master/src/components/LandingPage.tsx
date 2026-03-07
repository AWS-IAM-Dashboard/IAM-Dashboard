import image_a56b4f7b18c18090133cc7d8f7b65ccd011927bc from 'figma:asset/a56b4f7b18c18090133cc7d8f7b65ccd011927bc.png';
import { useState, useEffect } from "react";
import {
  Shield,
  Lock,
  Users,
  Activity,
  AlertTriangle,
  BarChart3,
  FileCheck,
  Zap,
  Eye,
  CheckCircle2,
  ArrowRight,
  Github,
  Server,
  Database,
  Cloud,
  Terminal,
  Globe,
} from "lucide-react";
import { motion } from "motion/react";
import { AnimatedBackground } from "./AnimatedBackground";
import dashboardMockup from "figma:asset/b2edbb3a2ee98b8869c07628c4fb2ed1f140a4aa.png";

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onAboutClick?: () => void;
}

export function LandingPage({
  onGetStarted,
  onLogin,
  onAboutClick,
}: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Unified Security Posture",
      description:
        "Centralized view of vulnerabilities across IAM, EC2, S3, Security Hub, GuardDuty, Inspector, and Macie",
    },
    {
      icon: <Eye className="w-6 h-6" />,
      title: "IAM Role Monitoring",
      description:
        "Complete IAM security analysis including over-permissioned users, MFA compliance, access key rotation, password policy enforcement, and inactive user detection",
    },
    {
      icon: <AlertTriangle className="w-6 h-6" />,
      title: "Risk Prioritization",
      description:
        "Advanced risk scoring and intelligent triage to focus on what matters most. Powered by automated CVE scanning and intelligent triage",
    },
    {
      icon: <Activity className="w-6 h-6" />,
      title: "Continuous Monitoring & Data Protection",
      description:
        "Run on-demand and scheduled scans to detect threats, misconfigurations, and sensitive data exposure risks.",
    },
    {
      icon: <FileCheck className="w-6 h-6" />,
      title: "Ticket Management",
      description:
        "Create, assign, and track remediation tickets directly from findings",
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Compliance Reporting",
      description:
        "Generate Security Summary, Threat Intelligence, and Executive reports for audit and stakeholder reviews.",
    },
  ];

  const personas = [
    {
      title: "SOC Analysts",
      description:
        "Centralized view of vulnerabilities across all AWS services. Create and track tickets for findings in one unified dashboard.",
      icon: <Users className="w-8 h-8" />,
    },
    {
      title: "Security Engineers",
      description:
        "Access scan results, compliance status, and risk scoring in a single pane. Assign and manage remediation tickets efficiently.",
      icon: <Lock className="w-8 h-8" />,
    },
    {
      title: "Security Teams",
      description:
        "Single source of truth for triage, prioritization, ticket tracking, and reporting. Reduce context switching and improve workflow.",
      icon: <Shield className="w-8 h-8" />,
    },
  ];

  const stats = [
    { value: "10", label: "AWS Cloud Services" },
    { value: "", label: "Built for Security Teams" },
    { value: "24/7", label: "Continuous Security Operations" },
    { value: "", label: "On Demand Scans" },
  ];

  const awsServices = [
    {
      name: "IAM Access Analyzer",
      fullName: "Identity & Access Management",
      icon: <Users className="w-6 h-6" />,
      status: "Monitoring",
      tier: "free",
    },
    {
      name: "Amazon EC2",
      fullName: "Elastic Compute Cloud",
      icon: <Server className="w-6 h-6" />,
      status: "Monitoring",
      tier: "free",
    },
    {
      name: "Amazon S3",
      fullName: "Simple Storage Service",
      icon: <Database className="w-6 h-6" />,
      status: "Monitoring",
      tier: "free",
    },
    {
      name: "Amazon VPC",
      fullName: "Virtual Private Cloud",
      icon: <Globe className="w-6 h-6" />,
      status: "Monitoring",
      tier: "free",
    },
    {
      name: "Amazon DynamoDB",
      fullName: "NoSQL Database Service",
      icon: <Database className="w-6 h-6" />,
      status: "Monitoring",
      tier: "free",
    },
    {
      name: "IAM Scan",
      fullName: "IAM Security Analysis",
      icon: <Lock className="w-6 h-6" />,
      status: "Monitoring",
      tier: "free",
    },
    {
      name: "Security Hub",
      fullName: "AWS Security Hub",
      icon: <Shield className="w-6 h-6" />,
      status: "Active",
      tier: "paid",
    },
    {
      name: "GuardDuty",
      fullName: "Amazon GuardDuty",
      icon: <Eye className="w-6 h-6" />,
      status: "Active",
      tier: "paid",
    },
    {
      name: "AWS Config",
      fullName: "AWS Config",
      icon: <FileCheck className="w-6 h-6" />,
      status: "Tracking",
      tier: "paid",
    },
    {
      name: "Inspector",
      fullName: "Amazon Inspector",
      icon: <AlertTriangle className="w-6 h-6" />,
      status: "Scanning",
      tier: "paid",
    },
    {
      name: "Macie",
      fullName: "Amazon Macie",
      icon: <BarChart3 className="w-6 h-6" />,
      status: "Active",
      tier: "paid",
    },
  ];

  const freeServices = awsServices.filter(service => service.tier === "free");
  const paidServices = awsServices.filter(service => service.tier === "paid");

  return (
    <div className="min-h-screen bg-black overflow-x-hidden selection:bg-green-500/30 selection:text-green-200">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-green-500 opacity-20 blur-[100px]"></div>
        <div className="absolute right-0 top-0 -z-10 h-full w-full bg-gradient-to-b from-transparent via-slate-950/50 to-black"></div>
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-in-out ${
        scrolled 
          ? 'px-4 sm:px-6 py-2'
          : 'px-0 py-0'
      }`}>
        <div className={`transition-all duration-700 ease-in-out ${
          scrolled
            ? 'max-w-5xl mx-auto rounded-3xl border border-white/5 backdrop-blur-md bg-black/20 shadow-[0_0_30px_rgba(255,255,255,0.1),0_0_60px_rgba(0,255,136,0.15)]'
            : 'max-w-7xl mx-auto border-b border-white/10 backdrop-blur-xl bg-black/50'
        } px-4 sm:px-6 lg:px-8`}>
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-16">
              <div className="flex items-center gap-1 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <img
                  src={image_a56b4f7b18c18090133cc7d8f7b65ccd011927bc}
                  alt="Logo"
                  className="h-12 w-auto rounded-lg mix-blend-screen brightness-110 contrast-110"
                />
                <span className="hidden sm:block font-bold text-white tracking-tight text-[20px]">
                  AWS Cloud Security
                </span>
              </div>
              <div className="hidden md:flex items-center gap-6">
                <button 
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  className="text-gray-400 hover:text-white transition-colors text-[20px]"
                >
                  Features
                </button>
                <button 
                  onClick={() => document.getElementById('solutions')?.scrollIntoView({ behavior: 'smooth' })}
                  className="text-gray-400 hover:text-white transition-colors text-[20px]"
                >
                  Solutions
                </button>
                <button
                  onClick={onAboutClick}
                  className="text-gray-400 hover:text-white transition-colors text-[20px]"
                >
                  About
                </button>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <button
                onClick={onLogin}
                className="hidden sm:block font-medium text-gray-300 hover:text-white transition-colors text-[16px]"
              >
                Sign In
              </button>
              
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 lg:pt-20 pb-20 lg:pb-32 overflow-hidden">
        <AnimatedBackground />
        
        <div className="max-w-[80%] mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16 sm:pb-24 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 text-xs font-medium mb-6 animate-pulse">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Live Threat Monitoring
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
                Secure Your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
                  AWS Cloud<br className="sm:hidden" /> Infrastructure
                </span>
              </h1>
              
              <p className="text-lg text-gray-400 mb-8 leading-relaxed max-w-xl">
                The centralized command center for DevOps and Security teams. 
                Detect vulnerabilities, manage risks, and ensure compliance across your entire AWS fleet.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={onGetStarted}
                  className="px-8 py-4 bg-green-500 hover:bg-green-400 text-black text-lg font-bold rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-all flex items-center justify-center gap-2"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={onLogin}
                  className="px-8 py-4 border border-white/10 hover:border-green-500/50 bg-white/5 hover:bg-white/10 text-white text-lg font-semibold rounded-xl backdrop-blur-sm transition-all"
                >
                  Live Demo
                </button>
              </div>

              {/* Stats Preview */}
              <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-6 border-t border-white/10 pt-12">
  {stats.map((stat, index) => {
    // Determine which sections to link to
    const isAwsServicesBox = stat.label === "AWS Cloud Services";
    const isSecurityTeamsBox = stat.label === "Built for Security Teams";
    
    // Uniform styling for EVERY box
    const baseStyle = "p-5 rounded-lg bg-black/40 border border-white/10 flex flex-col items-center justify-center transition-all duration-300 cursor-pointer hover:border-green-500/50 hover:bg-black/60 active:scale-95 transform-gpu group";

    return (
      <button
        key={index}
        onClick={() => {
          if (isAwsServicesBox) {
            document.getElementById('monitors')?.scrollIntoView({ behavior: 'smooth' });
          } else if (isSecurityTeamsBox) {
            document.getElementById('personas')?.scrollIntoView({ behavior: 'smooth' });
          }
        }}
        className={baseStyle}
      >
        <div className="text-2xl font-bold text-white mb-1 group-hover:text-green-400 transition-colors">
          {stat.value}
        </div>
        <div className="text-[10px] text-white uppercase tracking-widest text-center font-medium leading-tight">
          {stat.label}
        </div>
      </button>
    );
  })}
</div>
            </motion.div>

            {/* Right Column - Mockup */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative hidden lg:block"
              style={{ perspective: "2000px" }}
            >
              <motion.div 
                initial={{ rotateX: 5, rotateY: -12 }}
                whileHover={{ rotateX: 0, rotateY: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-xl shadow-2xl overflow-hidden group"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div className="absolute inset-0 bg-green-500/5 opacity-0 {/*group-hover:opacity-100*/} transition-opacity duration-500"></div>
                
                {/* Browser Chrome */}
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-900 border-b border-white/10">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  </div>
                  <div className="flex-1 mx-4 bg-black/50 rounded-md px-3 py-1 text-xs text-gray-500 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Lock className="w-3 h-3 text-green-500" />
                      aws-security-dashboard.app
                    </span>
                    <div className="flex gap-1">
                      <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></div>
                      <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse delay-75"></div>
                      <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse delay-150"></div>
                    </div>
                  </div>
                </div>
                
                {/* Image */}
                <img
                  src={dashboardMockup}
                  alt="Dashboard Interface"
                  className="w-full h-auto"
                />
              </motion.div>

              {/* Decorative Elements behind mockup */}
              <div className="absolute -inset-4 bg-gradient-to-r from-green-500 to-emerald-500 opacity-20 blur-2xl -z-10 rounded-3xl" />
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500/20 blur-3xl -z-10 rounded-full" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
        className="py-24 relative"
        id="features"
      >
        <div className="absolute inset-0 bg-slate-950/50 skew-y-3 transform origin-top-left -z-10 h-full w-full"></div>
        
        <div className="max-w-[80%] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Comprehensive <span className="text-green-400">Security Suite</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Everything you need to secure your cloud infrastructure in one unified platform.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative p-8 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md hover:border-green-500/50 hover:bg-white/[0.05] transition-all group overflow-hidden"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-green-500/50 to-emerald-500/50 opacity-0 group-hover:opacity-20 transition-opacity blur-sm pointer-events-none" />
                
                <div className="relative">
                  <div className="w-12 h-12 rounded-lg bg-black/50 border border-green-500/20 flex items-center justify-center text-green-400 mb-4 group-hover:scale-110 group-hover:border-green-500/50 transition-all shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-green-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Monitors Section - "The Grid" */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
        className="py-24 relative"
        id="monitors"
      >
        <div className="max-w-[80%] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6"
          >
            <div>
              <div className="text-green-400 font-mono text-sm mb-2">SYSTEM STATUS: ONLINE</div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                Active Monitoring
              </h2>
              <p className="text-gray-400 mt-2">
                Centralized Monitoring Across Core AWS Security Services
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 px-4 py-2 rounded-lg border border-green-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              All Systems Operational
            </div>
          </motion.div>

          {/* Free Tier Services */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-2xl font-bold text-white">Free Tier</h3>
              <span className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-mono uppercase">
                Included
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {freeServices.map((service, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative p-4 rounded-xl border border-white/10 bg-slate-900/50 hover:bg-slate-800/50 transition-all overflow-hidden"
                >
                  {/* Corner Accents */}
                  <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
                  </div>

                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 rounded-lg bg-white/5 text-gray-300 group-hover:text-green-400 group-hover:bg-green-500/10 transition-colors">
                      {service.icon}
                    </div>
                    <span className="text-[10px] font-mono uppercase text-gray-500 group-hover:text-green-500/70 transition-colors border border-white/5 px-2 py-0.5 rounded">
                      {service.status}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-white mb-1">
                    {service.name}
                  </h3>
                  <p className="text-xs text-gray-500 font-mono">
                    {service.fullName}
                  </p>

                  {/* Bottom line */}
                  <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r from-green-500 to-emerald-500 group-hover:w-full transition-all duration-500 ease-out"></div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Paid Tier Services */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-2xl font-bold text-white">Paid Tier</h3>
              <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono uppercase">
                Premium
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {paidServices.map((service, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative p-4 rounded-xl border border-white/10 bg-slate-900/50 hover:bg-slate-800/50 transition-all overflow-hidden"
                >
                  {/* Corner Accents */}
                  <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                  </div>

                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 rounded-lg bg-white/5 text-gray-300 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors">
                      {service.icon}
                    </div>
                    <span className="text-[10px] font-mono uppercase text-gray-500 group-hover:text-blue-500/70 transition-colors border border-white/5 px-2 py-0.5 rounded">
                      {service.status}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-white mb-1">
                    {service.name}
                  </h3>
                  <p className="text-xs text-gray-500 font-mono">
                    {service.fullName}
                  </p>

                  {/* Bottom line */}
                  <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r from-blue-500 to-blue-400 group-hover:w-full transition-all duration-500 ease-out"></div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Dashboard Preview & Benefits */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
        className="py-24 relative overflow-hidden"
        id="solutions"
      >
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-green-500/10 blur-[120px] rounded-full -z-10" />

        <div className="max-w-[80%] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-[16/10] rounded-xl border border-green-500/20 bg-slate-900/50 backdrop-blur-sm overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.5)] group">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent pointer-events-none z-10" />
                
                {/* Image instead of placeholder */}
                <img 
                  src={dashboardMockup} 
                  alt="Dashboard Full Preview" 
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700"
                />

                {/* Overlay UI elements to make it look active */}
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex gap-4">
                     <div className="h-2 flex-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full w-3/4 bg-green-500 animate-pulse"></div>
                     </div>
                     <div className="h-2 w-12 bg-white/10 rounded-full"></div>
                  </div>
                </div>
              </div>
              
              {/* Floating Badge */}
              <div className="absolute -bottom-6 -right-6 bg-slate-900 border border-green-500/30 p-4 rounded-xl shadow-xl">
                 <div className="flex items-center gap-3">
                    <div className="relative">
                       <Activity className="w-8 h-8 text-green-400" />
                       <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900"></div>
                    </div>
                    <div>
                       <div className="text-sm font-bold text-white">Threat Detected</div>
                       <div className="text-xs text-gray-400">Action Required</div>
                    </div>
                 </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-5xl font-bold text-white mb-6">
                Stop Tool Switching. <br />
                <span className="text-green-400">Start Remediation.</span>
              </h2>
              <p className="text-lg text-gray-400 mb-8">
                Security teams waste hours switching between AWS Console, Security Hub, GuardDuty, and ticketing systems. We unify everything in one powerful dashboard.
              </p>

              <div className="space-y-6">
                {[
                  { title: "Unified Visibility", desc: "Single pane of glass for all AWS regions and accounts" },
                  { title: "Automated Triage", desc: "Automated Risk Scoring and Prioritized Findings" },
                  { title: "One-Click Ticketing", desc: "Track remediation workflows directly in the dashboard" }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="mt-1 w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0 group-hover:bg-green-500/20 group-hover:border-green-500/50 transition-all">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold mb-1 group-hover:text-green-400 transition-colors">{item.title}</h4>
                      <p className="text-gray-500 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Target Personas */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
        className="py-24 relative bg-white/[0.02]"
        id="personas"
      >
        <div className="max-w-[80%] mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white mb-4">Built for Security Teams</h2>
              <p className="text-gray-400">Optimized workflows for every role in your SOC</p>
           </div>
           
           <div className="grid md:grid-cols-3 gap-8">
              {personas.map((persona, index) => (
                 <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-slate-900/40 border border-white/5 p-8 rounded-2xl hover:border-green-500/30 transition-colors"
                 >
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500/10 to-transparent border border-white/10 flex items-center justify-center mb-6">
                       {persona.icon}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">{persona.title}</h3>
                    <p className="text-gray-400 leading-relaxed text-sm">{persona.description}</p>
                 </motion.div>
              ))}
           </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
        className="py-24 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-green-900/20" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="relative rounded-3xl border border-green-500/30 bg-slate-900/80 backdrop-blur-xl p-12 text-center overflow-hidden">
            {/* Animated Glow behind CTA */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-green-500/10 to-transparent opacity-50 blur-xl pointer-events-none"></div>
            
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6 relative z-10">
              Ready to Secure Your <span className="text-green-400">AWS Cloud?</span>
            </h2>
            <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto relative z-10">
              Join hundreds of security teams who trust our platform to protect their infrastructure. Start your free 14-day trial today.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
              <button
                onClick={onGetStarted}
                className="px-8 py-4 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:shadow-[0_0_60px_rgba(34,197,94,0.6)] transition-all transform hover:-translate-y-1"
              >
                Start Free Trial
              </button>
              <button
                onClick={onLogin}
                className="px-8 py-4 border border-white/20 hover:border-green-500/50 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl backdrop-blur-sm transition-all"
              >
                Schedule Demo
              </button>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="relative border-t border-white/10 bg-black/40 backdrop-blur-md py-12 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center">
                <img
                  src={image_a56b4f7b18c18090133cc7d8f7b65ccd011927bc}
                  alt="Logo"
                  className="h-10 w-auto rounded-lg object-contain"
                />
              </div>
              <span className="text-white font-bold">AWS Cloud Security Dashboard</span>
            </div>
            
            <div className="flex gap-8 text-sm text-gray-400">
              <a href="#" className="hover:text-green-400 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-green-400 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-green-400 transition-colors">Contact</a>
            </div>
            
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Globe className="w-5 h-5" />
              </a>
            </div>
          </div>
          <div className="mt-8 text-center text-xs text-gray-600">
            © {new Date().getFullYear()} AWS Cloud Security Dashboard. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}