import { Shield, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import logoImage from "@/assets/logo.png";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (password.length < 8) newErrors.password = "Password must be at least 8 characters";
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password))
      newErrors.password = "Password needs uppercase, lowercase, and number";
    if (password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setSuccess(true);
    } catch {
      setErrors({ submit: "Something went wrong. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-svh items-center justify-center overflow-y-auto overflow-x-hidden bg-black p-4 py-6 sm:py-8" role="main" aria-label="Reset password">
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-8 text-center"
        >
          <h1 className="mb-2 text-xl font-bold text-white">Invalid or Expired Link</h1>
          <p className="mb-6 text-gray-400">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link
            to="/forgot-password"
            className="inline-flex items-center gap-2 text-green-400 transition-colors hover:text-green-300"
          >
            Request new reset link
          </Link>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-svh items-center justify-center overflow-y-auto overflow-x-hidden bg-black p-4 py-6 sm:py-8" role="main" aria-label="Password reset complete">
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="absolute left-1/4 top-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-green-500 opacity-20 blur-[120px] animate-pulse-slow"></div>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-8 text-center"
          role="status"
          aria-live="polite"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
            <Shield className="h-10 w-10 text-green-400" aria-hidden />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-white">Password Updated</h1>
          <p className="mb-6 text-gray-400">Your password has been reset successfully. You can now sign in.</p>
          <button
            onClick={() => navigate("/login")}
            className="w-full min-h-[44px] rounded-lg bg-gradient-to-r from-green-400 to-emerald-500 px-4 py-3 font-semibold text-black transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-black/80"
          >
            Sign In
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center overflow-y-auto overflow-x-hidden bg-black p-4 py-6 sm:py-8" role="main" aria-label="Set new password">
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
            <h1 className="mb-2 text-3xl font-bold text-white">Set New Password</h1>
            <p className="text-gray-400">Choose a strong password for your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-300">
                New Password
              </label>
              <div className="group relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-green-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((p) => ({ ...p, password: "" }));
                  }}
                  placeholder="Min. 8 chars, uppercase, lowercase, number"
                  className={`w-full rounded-lg border py-3 pl-11 pr-11 text-white placeholder-gray-500 backdrop-blur-sm transition-all focus:outline-none focus:ring-2 ${
                    errors.password
                      ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/50 bg-white/5"
                      : "border-white/10 bg-white/5 focus:border-green-500/50 focus:ring-green-500/50"
                  }`}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  aria-busy={isLoading}
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
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
              {errors.password && <p id="password-error" className="mt-1 text-xs text-red-400" role="alert">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-gray-300">
                Confirm New Password
              </label>
              <div className="group relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-green-400" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors((p) => ({ ...p, confirmPassword: "" }));
                  }}
                  placeholder="Re-enter your new password"
                  className={`w-full rounded-lg border py-3 pl-11 pr-11 text-white placeholder-gray-500 backdrop-blur-sm transition-all focus:outline-none focus:ring-2 ${
                    errors.confirmPassword
                      ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/50 bg-white/5"
                      : "border-white/10 bg-white/5 focus:border-green-500/50 focus:ring-green-500/50"
                  }`}
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center text-gray-500 transition-colors hover:text-green-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-black/80"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p id="confirmPassword-error" className="mt-1 text-xs text-red-400" role="alert">{errors.confirmPassword}</p>
              )}
            </div>

            {errors.submit && <p className="text-xs text-red-400" role="alert">{errors.submit}</p>}

            <button
              type="submit"
              disabled={isLoading}
              aria-busy={isLoading}
              className="group relative flex w-full min-h-[44px] items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-green-400 to-emerald-500 px-4 py-3 font-semibold text-black transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-500/50 disabled:pointer-events-none disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-black/80"
            >
              {isLoading ? (
                <span className="relative z-10 flex items-center gap-2">
                  <svg
                    className="h-5 w-5 animate-spin"
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
                  Updating...
                </span>
              ) : (
                <>
                  <span className="relative z-10">Reset Password</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-green-300 to-emerald-400 opacity-0 transition-opacity group-hover:opacity-100" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            Remember your password?{" "}
            <Link to="/login" className="font-semibold text-green-400 transition-colors hover:text-green-300">
              Sign in
            </Link>
          </div>

          <div className="mt-6 border-t border-white/10 pt-6">
            <div className="flex items-start gap-3 text-xs text-gray-500">
              <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400/50" />
              <p>
                Use a unique password that you don&apos;t reuse elsewhere. Include uppercase, lowercase, numbers,
                and symbols for stronger security.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
