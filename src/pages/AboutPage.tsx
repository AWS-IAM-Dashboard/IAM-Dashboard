import { ArrowLeft, Brain, Briefcase, Cloud as CloudIcon, Code, Database, Shield, Home, LogIn } from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { MobileQuickBar } from "../components/ui/MobileQuickBar";
import teamPhoto from "@/assets/team-photo.png";

export function AboutPage() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const teams = [
    {
      name: "Backend Team",
      icon: <Code className="h-8 w-8" />,
      description: "Building robust server-side infrastructure and APIs",
    },
    {
      name: "Frontend Team",
      icon: <Code className="h-8 w-8" />,
      description: "Crafting intuitive user interfaces and experiences",
    },
    {
      name: "AI Team",
      icon: <Brain className="h-8 w-8" />,
      description: "Developing intelligent threat detection algorithms",
    },
    {
      name: "DevOps Team",
      icon: <CloudIcon className="h-8 w-8" />,
      description: "Ensuring seamless deployment and infrastructure",
    },
    {
      name: "Security Team",
      icon: <Shield className="h-8 w-8" />,
      description: "Implementing best practices and vulnerability assessments",
    },
    {
      name: "Data Team",
      icon: <Database className="h-8 w-8" />,
      description: "Managing data pipelines and analytics infrastructure",
    },
    {
      name: "Project Management Team",
      icon: <Briefcase className="h-8 w-8" />,
      description: "Coordinating efforts and ensuring project success",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-black pb-24 text-white md:pb-0">
      <AnimatedBackground />

      <nav className="relative z-20 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate("/")}
            type="button"
            className="group inline-flex items-center gap-2 text-gray-300 transition-colors hover:text-green-400"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to home
          </button>
        </div>
      </nav>

      <section className="relative z-10 py-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mx-auto mb-12 max-w-3xl overflow-hidden rounded-2xl border-2 border-green-500/40 bg-slate-900/50 shadow-[0_0_30px_rgba(0,255,136,0.2)]"
          >
            <img
              src={teamPhoto}
              alt="AWS Cloud Security Dashboard team"
              className="h-auto w-full object-cover"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center"
          >
            <h1 className="mb-4 text-3xl font-bold sm:text-5xl">
              About <span className="text-green-400">Our Team</span>
            </h1>
            <p className="mx-auto max-w-3xl text-lg text-gray-300">
              We are a collaborative group of 25 talented students organized into 7 specialized teams, working together to create a comprehensive AWS Cloud Security Dashboard.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="mb-10 text-center text-3xl font-bold sm:text-4xl">
              Our <span className="text-green-400">Specialized Teams</span>
            </h2>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {teams.slice(0, 6).map((team, index) => (
                <motion.div
                  key={team.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + index * 0.06 }}
                  className="rounded-2xl border border-white/10 bg-slate-900/50 p-8 backdrop-blur-md"
                >
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-green-500/30 bg-green-500/10 text-green-400">
                    {team.icon}
                  </div>
                  <h3 className="mb-2 text-2xl font-bold sm:text-3xl">{team.name}</h3>
                  <p className="text-sm text-gray-400">{team.description}</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 flex justify-center">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
                className="w-full rounded-2xl border border-white/10 bg-slate-900/50 p-8 backdrop-blur-md md:w-1/2 lg:w-1/3"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-green-500/30 bg-green-500/10 text-green-400">
                  {teams[6].icon}
                </div>
                <h3 className="mb-2 text-2xl font-bold sm:text-3xl">{teams[6].name}</h3>
                <p className="text-sm text-gray-400">{teams[6].description}</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <MobileQuickBar
        items={[
          { key: "home", label: "Home", icon: Home, to: "/" },
          { key: "signin", label: "Sign in", icon: LogIn, to: "/login" },
        ]}
      />
    </div>
  );
}
