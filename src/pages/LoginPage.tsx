import { Shield, Github, Mail, ArrowLeft, Lock, Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import logoImage from "@/assets/logo.png";
import { emitPageLoadMetric } from "../services/telemetry";

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    emitPageLoadMetric("login");
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await auth.signIn(username, password);
      navigate("/app", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign in.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center overflow-y-auto overflow-x-hidden bg-black p-4 py-6 sm:py-8" role="main" aria-label="Sign in">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-1/4 top-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-green-500 opacity-20 blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 -z-10 h-[350px] w-[350px] rounded-full bg-emerald-500 opacity-15 blur-[100px] animate-pulse-slower"></div>
        <div className="absolute right-0 top-0 -z-10 h-full w-full bg-gradient-to-b from-transparent via-slate-950/30 to-black"></div>
      </div>

      <div className="relative z-10 w-full max-w-md py-4 sm:py-0">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          onClick={() => navigate("/")}
          className="group absolute left-0 top-0 flex min-h-[44px] min-w-[44px] items-center gap-2 text-gray-400 transition-colors hover:text-green-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-black sm:-top-16"
          type="button"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to home</span>
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:p-10"
        >
          <div className="pointer-events-none absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-green-500/20 via-transparent to-emerald-500/20 opacity-0 transition-opacity duration-500 hover:opacity-100"></div>

          <div className="relative mb-8 text-center">
            <motion.div
              className="mb-4 inline-flex items-center justify-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="relative">
                <img
                  src={logoImage}
                  alt="AWS Cloud Security Dashboard Logo"
                  className="h-16 w-auto rounded-xl"
                />
                <div className="absolute inset-0 rounded-xl bg-green-500/20 blur-xl"></div>
              </div>
            </motion.div>
            <h1 className="mb-2 text-3xl font-bold text-white">Welcome Back</h1>
            <p className="text-gray-400">Sign in to your AWS Cloud Security Dashboard</p>
          </div>

          <div className="mb-6 space-y-3">
            <button
              type="button"
              disabled
              className="group relative flex w-full min-h-[44px] cursor-not-allowed items-center justify-center gap-3 overflow-hidden rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white/50 transition-all"
              aria-label="Continue with Google"
            >
              <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-green-500/0 via-green-500/10 to-green-500/0 transition-transform duration-700 group-hover:translate-x-[100%]"></div>
              <svg className="relative z-10 h-5 w-5" viewBox="0 0 24 24">
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

            <button
              type="button"
              disabled
              className="group relative flex w-full min-h-[44px] cursor-not-allowed items-center justify-center gap-3 overflow-hidden rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white/50 transition-all"
              aria-label="Continue with GitHub"
            >
              <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-green-500/0 via-green-500/10 to-green-500/0 transition-transform duration-700 group-hover:translate-x-[100%]"></div>
              <Github className="relative z-10 h-5 w-5" aria-hidden />
              <span className="relative z-10">Continue with GitHub</span>
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-transparent px-4 text-gray-400">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="mb-2 block text-sm font-medium text-gray-300">
                Username
              </label>
              <div className="group relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-green-400" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Enter your username"
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-white placeholder-gray-500 backdrop-blur-sm transition-all focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="group relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-green-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-3 pl-11 pr-11 text-white placeholder-gray-500 backdrop-blur-sm transition-all focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center text-gray-500 transition-colors hover:text-green-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-black/80"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
                </button>
              </div>
            </div>

            {errorMessage ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {errorMessage}
              </div>
            ) : null}

            <div className="flex items-center justify-between text-sm">
              <label className="group flex cursor-pointer items-center gap-2 text-gray-400">
                <input
                  type="checkbox"
                  className="h-5 w-5 min-h-[20px] min-w-[20px] cursor-pointer rounded border-white/20 bg-white/5 text-green-500 focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-black/80"
                  aria-label="Remember me"
                />
                <span className="transition-colors group-hover:text-gray-300">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-green-400 transition-colors hover:text-green-300">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full min-h-[44px] overflow-hidden rounded-lg bg-gradient-to-r from-green-400 to-emerald-500 px-4 py-3 font-semibold text-black transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-black/80"
            >
              <span className="relative z-10">{isSubmitting ? "Signing In..." : "Sign In"}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-green-300 to-emerald-400 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="font-semibold text-green-400 transition-colors hover:text-green-300">
              Sign up
            </Link>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <div className="flex items-start gap-3 text-xs text-gray-500">
              <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400/50" />
              <p>
                Your data is protected with enterprise-grade encryption. By signing in, you agree to our{" "}
                <a href="#" className="text-green-400 transition-colors hover:text-green-300">Terms of Service</a>{" "}
                and{" "}
                <a href="#" className="text-green-400 transition-colors hover:text-green-300">Privacy Policy</a>.
              </p>
            </div>
          </div>
        </motion.div>

        <div className="absolute -right-4 -top-4 h-16 w-16 animate-pulse rounded-full border border-green-500/20"></div>
      </div>
    </div>
  );
}
