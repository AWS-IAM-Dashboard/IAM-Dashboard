import { Users, Code, Brain, Cloud as CloudIcon, Shield, Database, Briefcase, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { AnimatedBackground } from './AnimatedBackground';
import teamPhoto from 'figma:asset/e8b7973f0a17a3d3f80c597b67faeb915b197a3c.png';

interface AboutPageProps {
  onBack: () => void;
}

export function AboutPage({ onBack }: AboutPageProps) {
  const teams = [
    {
      name: "Backend Team",
      icon: <Code className="w-8 h-8" />,
      description: "Building robust server-side infrastructure and APIs"
    },
    {
      name: "Frontend Team",
      icon: <Code className="w-8 h-8" />,
      description: "Crafting intuitive user interfaces and experiences"
    },
    {
      name: "AI Team",
      icon: <Brain className="w-8 h-8" />,
      description: "Developing intelligent threat detection algorithms"
    },
    {
      name: "DevOps Team",
      icon: <CloudIcon className="w-8 h-8" />,
      description: "Ensuring seamless deployment and infrastructure"
    },
    {
      name: "Security Team",
      icon: <Shield className="w-8 h-8" />,
      description: "Implementing best practices and vulnerability assessments"
    },
    {
      name: "Data Team",
      icon: <Database className="w-8 h-8" />,
      description: "Managing data pipelines and analytics infrastructure"
    },
    {
      name: "Project Management Team",
      icon: <Briefcase className="w-8 h-8" />,
      description: "Coordinating efforts and ensuring project success"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-blue-950">
      {/* Navigation */}
      <nav className="border-b border-white/10 backdrop-blur-xl bg-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Home</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20">
        <AnimatedBackground />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6">
              About <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Our Team</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              We are a collaborative group of 25 talented students organized into 7 specialized teams, working together to create a comprehensive AWS Cloud Security Dashboard.
            </p>
          </motion.div>

          {/* Team Photo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-20 max-w-3xl mx-auto"
          >
            <div className="relative rounded-2xl overflow-hidden border-2 border-green-500/50 shadow-2xl shadow-green-500/30 bg-slate-900/50">
              <img
                src={teamPhoto}
                alt="AWS Cloud Security Dashboard Team - 25 Students"
                className="w-full h-auto object-cover"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.src = "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaXZlcnNlJTIwc3R1ZGVudCUyMHRlYW0lMjBncm91cCUyMHBob3RvJTIwdGVjaG5vbG9neXxlbnwxfHx8fDE3NzIzMDc5MTN8MA&ixlib=rb-4.1.0&q=80&w=1080";
                }}
              />
            </div>
          </motion.div>

          {/* Teams Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-16"
          >
            <h2 className="text-4xl font-bold text-white text-center mb-12">
              Our <span className="text-green-400">Specialized Teams</span>
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.slice(0, 6).map((team, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                  className="p-6 rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm hover:border-green-500/30 hover:bg-white/10 transition-all group"
                >
                  <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-green-400/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center text-green-400 mb-4 group-hover:scale-110 transition-transform">
                    {team.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{team.name}</h3>
                  <p className="text-gray-400 text-sm">{team.description}</p>
                </motion.div>
              ))}
            </div>
            
            {/* Project Management Team - Centered at Bottom */}
            <div className="flex justify-center mt-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 + 6 * 0.1 }}
                className="p-6 rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm hover:border-green-500/30 hover:bg-white/10 transition-all group w-full md:w-1/2 lg:w-1/3"
              >
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-green-400/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center text-green-400 mb-4 group-hover:scale-110 transition-transform">
                  {teams[6].icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{teams[6].name}</h3>
                <p className="text-gray-400 text-sm">{teams[6].description}</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-400">
            <p>© 2026 AWS Cloud Security Dashboard. Built with passion by 25 students across 7 teams.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}