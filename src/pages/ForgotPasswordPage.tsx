import { Shield, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logoImage from "@/assets/logo.png";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center overflow-y-auto overflow-x-hidden bg-black p-4 py-6 sm:py-8" role="main" aria-label="Forgot password">
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
          onClick={() => navigate("/login")}
          className="group absolute left-0 top-0 flex min-h-[44px] min-w-[44px] items-center gap-2 text-gray-400 transition-colors hover:text-green-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-black sm:-top-16"
          type="button"
          aria-label="Back to login"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to login</span>
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

            <AnimatePresence mode="wait">
              {!submitted ? (
                <motion.div
                  key="request"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  <h1 className="text-3xl font-bold text-white">Forgot Password?</h1>
                  <p className="text-gray-400">
                    Enter your email and we&apos;ll send you a link to reset your password
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                  role="status"
                  aria-live="polite"
                  aria-label="Reset link sent"
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                    <CheckCircle2 className="h-10 w-10 text-green-400" aria-hidden />
                  </div>
                  <h1 className="text-3xl font-bold text-white">Check your email</h1>
                  <p className="text-gray-400">
                    We&apos;ve sent a password reset link to <strong className="text-white">{email}</strong>
                  </p>
                  <p className="text-sm text-gray-500">
                    The link will expire in 1 hour. If you don&apos;t see the email, check your spam folder.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.form
                key="form"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-300">
                    Email Address
                  </label>
                  <div className="group relative">
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-green-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError("");
                      }}
                      placeholder="you@company.com"
                      className={`w-full rounded-lg border py-3 pl-11 pr-4 text-white placeholder-gray-500 backdrop-blur-sm transition-all focus:outline-none focus:ring-2 ${
                        error
                          ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/50 bg-white/5"
                          : "border-white/10 bg-white/5 focus:border-green-500/50 focus:ring-green-500/50"
                      }`}
                      aria-invalid={!!error}
                      aria-describedby={error ? "email-error" : undefined}
                      aria-busy={isLoading}
                      required
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>
                  {error && <p id="email-error" className="mt-1 text-xs text-red-400" role="alert">{error}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  aria-busy={isLoading}
                  aria-live="polite"
                  className="group relative flex w-full min-h-[44px] items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-green-400 to-emerald-500 px-4 py-3 font-semibold text-black transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-500/50 disabled:pointer-events-none disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-black/80"
                >
                  {isLoading ? (
                    <span className="relative z-10 flex items-center gap-2" aria-hidden>
                      <svg
                        className="h-5 w-5 animate-spin"
                        aria-hidden
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    <>
                      <span className="relative z-10">Send Reset Link</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-green-300 to-emerald-400 opacity-0 transition-opacity group-hover:opacity-100" />
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="group relative w-full min-h-[44px] overflow-hidden rounded-lg bg-gradient-to-r from-green-400 to-emerald-500 px-4 py-3 font-semibold text-black transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-black/80"
                >
                  <span className="relative z-10">Back to Sign In</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-green-300 to-emerald-400 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setEmail("");
                  }}
                  className="w-full min-h-[44px] rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-gray-300 transition-colors hover:border-green-500/30 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-black/80"
                >
                  Didn&apos;t receive it? Try again
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 border-t border-white/10 pt-6">
            <div className="flex items-start gap-3 text-xs text-gray-500">
              <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400/50" />
              <p>
                For security, password reset links expire after 1 hour. If you didn&apos;t request this, you can
                safely ignore this email.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
