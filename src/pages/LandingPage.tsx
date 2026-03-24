import { useState, useEffect } from "react";
import {
  Shield,
  Lock,
  Users,
  Activity,
  AlertTriangle,
  BarChart3,
  FileCheck,
  Eye,
  CheckCircle2,
  ArrowRight,
  Github,
  Server,
  Database,
  Globe,
} from "lucide-react";
import { motion } from "motion/react";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { useNavigate } from "react-router-dom";
import logoImage from "@/assets/logo.png";
import dashboardMockup from "@/assets/dashboard-mockup.png";

export function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const onGetStarted = () => navigate("/login");
  const onLogin = () => navigate("/login");
  const onAboutClick = () => navigate("/about");

  const features = [
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Unified Security Posture",
      description:
        "Centralized view of vulnerabilities across IAM, EC2, S3, Security Hub, GuardDuty, Inspector, and Macie",
    },
    {
      icon: <Eye className="h-6 w-6" />,
      title: "IAM Role Monitoring",
      description:
        "Complete IAM security analysis including over-permissioned users, MFA compliance, access key rotation, password policy enforcement, and inactive user detection",
    },
    {
      icon: <AlertTriangle className="h-6 w-6" />,
      title: "Risk Prioritization",
      description:
        "Advanced risk scoring and intelligent triage to focus on what matters most. Powered by automated CVE scanning and intelligent triage",
    },
    {
      icon: <Activity className="h-6 w-6" />,
      title: "Continuous Monitoring & Data Protection",
      description:
        "Run on-demand and scheduled scans to detect threats, misconfigurations, and sensitive data exposure risks.",
    },
    {
      icon: <FileCheck className="h-6 w-6" />,
      title: "Ticket Management",
      description:
        "Create, assign, and track remediation tickets directly from findings",
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
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
      icon: <Users className="h-8 w-8" />,
    },
    {
      title: "Security Engineers",
      description:
        "Access scan results, compliance status, and risk scoring in a single pane. Assign and manage remediation tickets efficiently.",
      icon: <Lock className="h-8 w-8" />,
    },
    {
      title: "Security Teams",
      description:
        "Single source of truth for triage, prioritization, ticket tracking, and reporting. Reduce context switching and improve workflow.",
      icon: <Shield className="h-8 w-8" />,
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
      icon: <Users className="h-6 w-6" />,
      status: "Monitoring",
      tier: "free",
    },
    {
      name: "Amazon EC2",
      fullName: "Elastic Compute Cloud",
      icon: <Server className="h-6 w-6" />,
      status: "Monitoring",
      tier: "free",
    },
    {
      name: "Amazon S3",
      fullName: "Simple Storage Service",
      icon: <Database className="h-6 w-6" />,
      status: "Monitoring",
      tier: "free",
    },
    {
      name: "Amazon VPC",
      fullName: "Virtual Private Cloud",
      icon: <Globe className="h-6 w-6" />,
      status: "Monitoring",
      tier: "free",
    },
    {
      name: "Amazon DynamoDB",
      fullName: "NoSQL Database Service",
      icon: <Database className="h-6 w-6" />,
      status: "Monitoring",
      tier: "free",
    },
    {
      name: "IAM Scan",
      fullName: "IAM Security Analysis",
      icon: <Lock className="h-6 w-6" />,
      status: "Monitoring",
      tier: "free",
    },
    {
      name: "Security Hub",
      fullName: "AWS Security Hub",
      icon: <Shield className="h-6 w-6" />,
      status: "Active",
      tier: "paid",
    },
    {
      name: "GuardDuty",
      fullName: "Amazon GuardDuty",
      icon: <Eye className="h-6 w-6" />,
      status: "Active",
      tier: "paid",
    },
    {
      name: "AWS Config",
      fullName: "AWS Config",
      icon: <FileCheck className="h-6 w-6" />,
      status: "Tracking",
      tier: "paid",
    },
    {
      name: "Inspector",
      fullName: "Amazon Inspector",
      icon: <AlertTriangle className="h-6 w-6" />,
      status: "Scanning",
      tier: "paid",
    },
    {
      name: "Macie",
      fullName: "Amazon Macie",
      icon: <BarChart3 className="h-6 w-6" />,
      status: "Active",
      tier: "paid",
    },
  ];

  const freeServices = awsServices.filter((service) => service.tier === "free");
  const paidServices = awsServices.filter((service) => service.tier === "paid");

  return (
    <div className="selection:bg-green-500/30 selection:text-green-200 min-h-screen overflow-x-hidden bg-black">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-green-500 opacity-20 blur-[100px]"></div>
        <div className="absolute right-0 top-0 -z-10 h-full w-full bg-gradient-to-b from-transparent via-slate-950/50 to-black"></div>
      </div>

      <nav
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-700 ease-in-out ${
          scrolled ? "px-4 py-2 sm:px-6" : "px-0 py-0"
        }`}
      >
        <div
          className={`transition-all duration-700 ease-in-out ${
            scrolled
              ? "mx-auto max-w-5xl rounded-3xl border border-white/5 bg-black/20 shadow-[0_0_30px_rgba(255,255,255,0.1),0_0_60px_rgba(0,255,136,0.15)] backdrop-blur-md"
              : "mx-auto max-w-7xl border-b border-white/10 bg-black/50 backdrop-blur-xl"
          } px-4 sm:px-6 lg:px-8`}
        >
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-16">
              <div
                className="flex cursor-pointer items-center gap-1"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                <img
                  src={logoImage}
                  alt="Logo"
                  className="h-12 w-auto rounded-lg brightness-110 contrast-110 mix-blend-screen"
                />
                <span className="hidden text-[20px] font-bold tracking-tight text-white sm:block">
                  AWS Cloud Security
                </span>
              </div>
              <div className="hidden items-center gap-6 md:flex">
                <button
                  onClick={() =>
                    document
                      .getElementById("features")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="text-[20px] text-gray-400 transition-colors hover:text-white"
                >
                  Features
                </button>
                <button
                  onClick={() =>
                    document
                      .getElementById("solutions")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="text-[20px] text-gray-400 transition-colors hover:text-white"
                >
                  Solutions
                </button>
                <button
                  onClick={onAboutClick}
                  className="text-[20px] text-gray-400 transition-colors hover:text-white"
                >
                  About
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-8">
              <button
                onClick={onLogin}
                className="rounded-md border border-white/10 px-3 py-1.5 text-sm font-medium text-gray-200 transition-colors hover:border-green-500/40 hover:text-white sm:border-0 sm:px-0 sm:py-0 sm:text-[16px] sm:text-gray-300"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden pb-20 pt-16 lg:pb-32 lg:pt-20">
        <AnimatedBackground />

        <div className="relative z-10 mx-auto max-w-[80%] px-4 pb-16 pt-8 sm:px-6 sm:pb-24 sm:pt-12 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-6 inline-flex animate-pulse items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                </span>
                Live Threat Monitoring
              </div>

              <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-7xl">
                Secure Your <br />
                <span className="bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
                  AWS Cloud<br className="sm:hidden" /> Infrastructure
                </span>
              </h1>

              <p className="mb-8 max-w-xl text-lg leading-relaxed text-gray-400">
                The centralized command center for DevOps and Security teams.
                Detect vulnerabilities, manage risks, and ensure compliance across
                your entire AWS fleet.
              </p>

              <div className="flex flex-col gap-4 sm:flex-row">
                <button
                  onClick={onGetStarted}
                  className="flex items-center justify-center gap-2 rounded-xl bg-green-500 px-8 py-4 text-lg font-bold text-black shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all hover:bg-green-400 hover:shadow-[0_0_30px_rgba(34,197,94,0.5)]"
                >
                  Get Started
                  <ArrowRight className="h-5 w-5" />
                </button>
                <button
                  onClick={onLogin}
                  className="rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-lg font-semibold text-white backdrop-blur-sm transition-all hover:border-green-500/50 hover:bg-white/10"
                >
                  Live Demo
                </button>
              </div>

              <div className="mt-12 grid grid-cols-2 gap-6 border-t border-white/10 pt-12 lg:grid-cols-4">
                {stats.map((stat, index) => {
                  const isAwsServicesBox = stat.label === "AWS Cloud Services";
                  const isSecurityTeamsBox = stat.label === "Built for Security Teams";

                  const baseStyle =
                    "group transform-gpu cursor-pointer rounded-lg border border-white/10 bg-black/40 p-5 transition-all duration-300 hover:border-green-500/50 hover:bg-black/60 active:scale-95 flex flex-col items-center justify-center";

                  return (
                    <button
                      key={index}
                      onClick={() => {
                        if (isAwsServicesBox) {
                          document
                            .getElementById("monitors")
                            ?.scrollIntoView({ behavior: "smooth" });
                        } else if (isSecurityTeamsBox) {
                          document
                            .getElementById("personas")
                            ?.scrollIntoView({ behavior: "smooth" });
                        }
                      }}
                      className={baseStyle}
                    >
                      <div className="mb-1 text-2xl font-bold text-white transition-colors group-hover:text-green-400">
                        {stat.value}
                      </div>
                      <div className="text-center text-[10px] font-medium uppercase leading-tight tracking-widest text-white">
                        {stat.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>

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
                className="group relative z-10 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 shadow-2xl backdrop-blur-xl"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div className="absolute inset-0 bg-green-500/5 opacity-0 transition-opacity duration-500"></div>

                <div className="flex items-center gap-2 border-b border-white/10 bg-slate-900 px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500/50" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500/50" />
                    <div className="h-3 w-3 rounded-full bg-green-500/50" />
                  </div>
                  <div className="mx-4 flex flex-1 items-center justify-between rounded-md bg-black/50 px-3 py-1 text-xs text-gray-500">
                    <span className="flex items-center gap-2">
                      <Lock className="h-3 w-3 text-green-500" />
                      aws-security-dashboard.app
                    </span>
                    <div className="flex gap-1">
                      <div className="h-1 w-1 animate-pulse rounded-full bg-green-500"></div>
                      <div className="delay-75 h-1 w-1 animate-pulse rounded-full bg-green-500"></div>
                      <div className="delay-150 h-1 w-1 animate-pulse rounded-full bg-green-500"></div>
                    </div>
                  </div>
                </div>

                <img
                  src={dashboardMockup}
                  alt="Dashboard Interface"
                  className="h-auto w-full"
                />
              </motion.div>

              <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-r from-green-500 to-emerald-500 opacity-20 blur-2xl" />
              <div className="absolute -bottom-10 -right-10 -z-10 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
            </motion.div>
          </div>
        </div>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
        className="relative py-24"
        id="features"
      >
        <div className="absolute -z-10 h-full w-full origin-top-left skew-y-3 transform bg-slate-950/50"></div>

        <div className="relative z-10 mx-auto max-w-[80%] px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-20 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
              Comprehensive <span className="text-green-400">Security Suite</span>
            </h2>
            <p className="mx-auto max-w-2xl text-gray-400">
              Everything you need to secure your cloud infrastructure in one unified platform.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-8 backdrop-blur-md transition-all hover:border-green-500/50 hover:bg-white/[0.05]"
              >
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-green-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-r from-green-500/50 to-emerald-500/50 opacity-0 blur-sm transition-opacity group-hover:opacity-20" />

                <div className="relative">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-green-500/20 bg-black/50 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.1)] transition-all group-hover:scale-110 group-hover:border-green-500/50">
                    {feature.icon}
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-white transition-colors group-hover:text-green-400">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-400">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
        className="relative py-24"
        id="monitors"
      >
        <div className="mx-auto max-w-[80%] px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-12 flex flex-col items-end justify-between gap-6 md:flex-row"
          >
            <div>
              <div className="mb-2 font-mono text-sm text-green-400">SYSTEM STATUS: ONLINE</div>
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Active Monitoring
              </h2>
              <p className="mt-2 text-gray-400">
                Centralized Monitoring Across Core AWS Security Services
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-2 text-sm text-green-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
              </span>
              All Systems Operational
            </div>
          </motion.div>

          <div className="mb-12">
            <div className="mb-6 flex items-center gap-3">
              <h3 className="text-2xl font-bold text-white">Free Tier</h3>
              <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 font-mono text-xs uppercase text-green-400">
                Included
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {freeServices.map((service, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/50 p-4 transition-all hover:bg-slate-800/50"
                >
                  <div className="absolute right-0 top-0 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
                  </div>

                  <div className="mb-4 flex items-start justify-between">
                    <div className="rounded-lg bg-white/5 p-2 text-gray-300 transition-colors group-hover:bg-green-500/10 group-hover:text-green-400">
                      {service.icon}
                    </div>
                    <span className="rounded border border-white/5 px-2 py-0.5 font-mono text-[10px] uppercase text-gray-500 transition-colors group-hover:text-green-500/70">
                      {service.status}
                    </span>
                  </div>

                  <h3 className="mb-1 text-lg font-bold text-white">
                    {service.name}
                  </h3>
                  <p className="font-mono text-xs text-gray-500">
                    {service.fullName}
                  </p>

                  <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500 ease-out group-hover:w-full"></div>
                </motion.div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-6 flex items-center gap-3">
              <h3 className="text-2xl font-bold text-white">Paid Tier</h3>
              <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 font-mono text-xs uppercase text-blue-400">
                Premium
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {paidServices.map((service, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/50 p-4 transition-all hover:bg-slate-800/50"
                >
                  <div className="absolute right-0 top-0 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                  </div>

                  <div className="mb-4 flex items-start justify-between">
                    <div className="rounded-lg bg-white/5 p-2 text-gray-300 transition-colors group-hover:bg-blue-500/10 group-hover:text-blue-400">
                      {service.icon}
                    </div>
                    <span className="rounded border border-white/5 px-2 py-0.5 font-mono text-[10px] uppercase text-gray-500 transition-colors group-hover:text-blue-500/70">
                      {service.status}
                    </span>
                  </div>

                  <h3 className="mb-1 text-lg font-bold text-white">
                    {service.name}
                  </h3>
                  <p className="font-mono text-xs text-gray-500">
                    {service.fullName}
                  </p>

                  <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500 ease-out group-hover:w-full"></div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden py-24"
        id="solutions"
      >
        <div className="absolute left-1/2 top-1/2 -z-10 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-500/10 blur-[120px]" />

        <div className="mx-auto max-w-[80%] px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="group relative aspect-[16/10] overflow-hidden rounded-xl border border-green-500/20 bg-slate-900/50 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-sm">
                <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-br from-green-500/10 to-transparent" />

                <img
                  src={dashboardMockup}
                  alt="Dashboard Full Preview"
                  className="h-full w-full object-cover opacity-80 transition-opacity duration-700 group-hover:opacity-100"
                />

                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex gap-4">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-3/4 animate-pulse bg-green-500"></div>
                    </div>
                    <div className="h-2 w-12 rounded-full bg-white/10"></div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-6 -right-6 rounded-xl border border-green-500/30 bg-slate-900 p-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Activity className="h-8 w-8 text-green-400" />
                    <div className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-red-500"></div>
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
              <h2 className="mb-6 text-3xl font-bold text-white sm:text-5xl">
                Stop Tool Switching. <br />
                <span className="text-green-400">Start Remediation.</span>
              </h2>
              <p className="mb-8 text-lg text-gray-400">
                Security teams waste hours switching between AWS Console, Security Hub, GuardDuty, and ticketing systems. We unify everything in one powerful dashboard.
              </p>

              <div className="space-y-6">
                {[
                  {
                    title: "Unified Visibility",
                    desc: "Single pane of glass for all AWS regions and accounts",
                  },
                  {
                    title: "Automated Triage",
                    desc: "Automated Risk Scoring and Prioritized Findings",
                  },
                  {
                    title: "One-Click Ticketing",
                    desc: "Track remediation workflows directly in the dashboard",
                  },
                ].map((item, i) => (
                  <div key={i} className="group flex gap-4">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-green-500/20 bg-green-500/10 transition-all group-hover:border-green-500/50 group-hover:bg-green-500/20">
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <h4 className="mb-1 font-bold text-white transition-colors group-hover:text-green-400">
                        {item.title}
                      </h4>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
        className="relative bg-white/[0.02] py-24"
        id="personas"
      >
        <div className="mx-auto max-w-[80%] px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white">
              Built for Security Teams
            </h2>
            <p className="text-gray-400">
              Optimized workflows for every role in your SOC
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {personas.map((persona, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="rounded-2xl border border-white/5 bg-slate-900/40 p-8 transition-colors hover:border-green-500/30"
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-green-500/10 to-transparent">
                  {persona.icon}
                </div>
                <h3 className="mb-3 text-xl font-bold text-white">{persona.title}</h3>
                <p className="text-sm leading-relaxed text-gray-400">
                  {persona.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden py-24"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-green-900/20" />
        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-green-500/30 bg-slate-900/80 p-12 text-center backdrop-blur-xl">
            <div className="pointer-events-none absolute left-1/2 top-0 h-full w-full -translate-x-1/2 bg-gradient-to-b from-green-500/10 to-transparent opacity-50 blur-xl"></div>

            <h2 className="relative z-10 mb-6 text-4xl font-bold text-white sm:text-5xl">
              Ready to Secure Your <span className="text-green-400">AWS Cloud?</span>
            </h2>
            <p className="relative z-10 mx-auto mb-10 max-w-2xl text-lg text-gray-400">
              Join hundreds of security teams who trust our platform to protect their infrastructure. Start your free 14-day trial today.
            </p>

            <div className="relative z-10 flex flex-col justify-center gap-4 sm:flex-row">
              <button
                onClick={onGetStarted}
                className="transform rounded-xl bg-green-500 px-8 py-4 font-bold text-black shadow-[0_0_30px_rgba(34,197,94,0.4)] transition-all hover:-translate-y-1 hover:bg-green-400 hover:shadow-[0_0_60px_rgba(34,197,94,0.6)]"
              >
                Start Free Trial
              </button>
              <button
                onClick={onLogin}
                className="rounded-xl border border-white/20 bg-white/5 px-8 py-4 font-semibold text-white backdrop-blur-sm transition-all hover:border-green-500/50 hover:bg-white/10"
              >
                Schedule Demo
              </button>
            </div>
          </div>
        </div>
      </motion.section>

      <footer className="relative z-10 border-t border-white/10 bg-black/40 py-12 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center">
                <img
                  src={logoImage}
                  alt="Logo"
                  className="h-10 w-auto rounded-lg object-contain"
                />
              </div>
              <span className="font-bold text-white">AWS Cloud Security Dashboard</span>
            </div>

            <div className="flex gap-8 text-sm text-gray-400">
              <a href="#" className="transition-colors hover:text-green-400">Privacy Policy</a>
              <a href="#" className="transition-colors hover:text-green-400">Terms of Service</a>
              <a href="#" className="transition-colors hover:text-green-400">Contact</a>
            </div>

            <div className="flex gap-4">
              <a href="#" className="text-gray-400 transition-colors hover:text-white">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 transition-colors hover:text-white">
                <Globe className="h-5 w-5" />
              </a>
            </div>
          </div>
          <div className="mt-8 text-center text-xs text-gray-600">
            © {new Date().getFullYear()} AWS Cloud Security Dashboard. All rights
            reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
