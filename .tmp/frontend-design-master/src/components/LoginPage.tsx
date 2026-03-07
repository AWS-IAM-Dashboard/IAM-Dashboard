import { Shield, Github, Mail, ArrowLeft, Lock, Eye, EyeOff, Cloud } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import image_a56b4f7b18c18090133cc7d8f7b65ccd011927bc from 'figma:asset/a56b4f7b18c18090133cc7d8f7b65ccd011927bc.png';

interface LoginPageProps {
  onBack: () => void;
  onLogin: () => void;
}

export function LoginPage({ onBack, onLogin }: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 overflow-hidden">
      {/* Fixed Background Effects - matching LandingPage */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Cyber Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        {/* Animated Gradient Orbs */}
        <div className="absolute left-1/4 top-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-green-500 opacity-20 blur-[120px] animate-pulse-slow"></div>
        <div className="absolute right-1/4 bottom-1/4 -z-10 h-[350px] w-[350px] rounded-full bg-emerald-500 opacity-15 blur-[100px] animate-pulse-slower"></div>
        
        {/* Top Gradient Overlay */}
        <div className="absolute right-0 top-0 -z-10 h-full w-full bg-gradient-to-b from-transparent via-slate-950/30 to-black"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          onClick={onBack}
          className="absolute -top-16 left-0 flex items-center gap-2 text-gray-400 hover:text-green-400 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to home</span>
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl p-8 sm:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        >
          {/* Cyber Glow Effect */}
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-green-500/20 via-transparent to-emerald-500/20 opacity-0 transition-opacity duration-500 hover:opacity-100 pointer-events-none"></div>
          
          {/* Logo and Title */}
          <div className="text-center mb-8 relative">
            <motion.div 
              className="inline-flex items-center justify-center mb-4"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="relative">
                <img
                  src={image_a56b4f7b18c18090133cc7d8f7b65ccd011927bc}
                  alt="AWS Cloud Security Dashboard Logo"
                  className="h-16 w-auto rounded-xl"
                />
                <div className="absolute inset-0 rounded-xl bg-green-500/20 blur-xl"></div>
              </div>
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-gray-400">Sign in to your AWS Cloud Security Dashboard</p>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <button className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-green-500/30 text-white flex items-center justify-center gap-3 transition-all group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-500/10 to-green-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <svg className="w-5 h-5 relative z-10" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="relative z-10">Continue with Google</span>
            </button>

            <button className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-green-500/30 text-white flex items-center justify-center gap-3 transition-all group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-500/10 to-green-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <Github className="w-5 h-5 relative z-10" />
              <span className="relative z-10">Continue with GitHub</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-transparent text-gray-400">Or continue with email</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-green-400 transition-colors" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full pl-11 pr-4 py-3 rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all backdrop-blur-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-green-400 transition-colors" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-11 pr-11 py-3 rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all backdrop-blur-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-green-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-400 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-green-500 focus:ring-green-500/50 focus:ring-offset-0 cursor-pointer"
                />
                <span className="group-hover:text-gray-300 transition-colors">Remember me</span>
              </label>
              <a href="#" className="text-green-400 hover:text-green-300 transition-colors">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className="w-full px-4 py-3 bg-gradient-to-r from-green-400 to-emerald-500 text-black font-semibold rounded-lg hover:shadow-lg hover:shadow-green-500/50 transition-all transform hover:-translate-y-0.5 relative overflow-hidden group"
            >
              <span className="relative z-10">Sign In</span>
              <div className="absolute inset-0 bg-gradient-to-r from-green-300 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center text-sm text-gray-400">
            Don't have an account?{' '}
            <a href="#" className="text-green-400 hover:text-green-300 transition-colors font-semibold">
              Sign up
            </a>
          </div>

          {/* Security Notice */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex items-start gap-3 text-xs text-gray-500">
              <Shield className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400/50" />
              <p>
                Your data is protected with enterprise-grade encryption. By signing in, you agree to our{' '}
                <a href="#" className="text-green-400 hover:text-green-300 transition-colors">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-green-400 hover:text-green-300 transition-colors">Privacy Policy</a>.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Additional Cyber Effect - Floating Particles */}
        <div className="absolute -top-4 -right-4 w-16 h-16 border border-green-500/20 rounded-full animate-pulse"></div>
      </div>
    </div>
  );
}