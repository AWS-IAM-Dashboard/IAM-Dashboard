import { Shield, Github, Mail, ArrowLeft, Lock, Eye, EyeOff, User } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import logoImage from "@/assets/logo.png";

export function SignupPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = "Full name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Please enter a valid email";
    if (password.length < 8) newErrors.password = "Password must be at least 8 characters";
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password))
      newErrors.password = "Password needs uppercase, lowercase, and number";
    if (password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    if (!acceptTerms) newErrors.terms = "You must accept the Terms and Privacy Policy";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setErrors({});

    try {
      const res = await fetch("/api/v1/signup/welcome-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fullName.trim(), email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ form: data.error || "Something went wrong. Please try again." });
        return;
      }

      setSuccess(true);
    } catch {
      setErrors({ form: "Unable to reach the server. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center overflow-y-auto overflow-x-hidden bg-black p-4 py-6 sm:py-8" role="main" aria-label="Create account">
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

          {success ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                <Mail className="h-8 w-8 text-green-400" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-white">You're all set!</h2>
              <p className="mb-6 text-gray-400">
                A welcome email has been sent to <span className="text-green-400">{email}</span>.
              </p>
              <Link
                to="/login"
                className="inline-block rounded-lg bg-gradient-to-r from-green-400 to-emerald-500 px-6 py-3 font-semibold text-black transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-500/50"
              >
                Go to Sign In
              </Link>
            </div>
          ) : (
          <>
          <div className="relative mb-6 text-center">
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
            <h1 className="mb-2 text-3xl font-bold text-white">Create Account</h1>
            <p className="text-gray-400">Join the AWS Cloud Security Dashboard</p>
          </div>

          <div className="mb-6 space-y-3">
            <button
              type="button"
              className="group relative flex w-full min-h-[44px] items-center justify-center gap-3 overflow-hidden rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white transition-all hover:border-green-500/30 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-black/80"
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
              className="group relative flex w-full min-h-[44px] items-center justify-center gap-3 overflow-hidden rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white transition-all hover:border-green-500/30 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-black/80"
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
              <span className="bg-transparent px-4 text-gray-400">Or register with email</span>
            </div>
          </div>

          {errors.form && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400" role="alert">
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-gray-300">
                Full Name
              </label>
              <div className="group relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-green-400" />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.fullName) setErrors((p) => ({ ...p, fullName: "" }));
                  }}
                  placeholder="John Doe"
                  className={`w-full rounded-lg border py-3 pl-11 pr-4 text-white placeholder-gray-500 backdrop-blur-sm transition-all focus:outline-none focus:ring-2 ${
                    errors.fullName
                      ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/50 bg-white/5"
                      : "border-white/10 bg-white/5 focus:border-green-500/50 focus:ring-green-500/50"
                  }`}
                  aria-invalid={!!errors.fullName}
                  aria-describedby={errors.fullName ? "fullName-error" : undefined}
                  required
                  autoComplete="name"
                />
              </div>
              {errors.fullName && <p id="fullName-error" className="mt-1 text-xs text-red-400" role="alert">{errors.fullName}</p>}
            </div>

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
                    if (errors.email) setErrors((p) => ({ ...p, email: "" }));
                  }}
                  placeholder="you@company.com"
                  className={`w-full rounded-lg border py-3 pl-11 pr-4 text-white placeholder-gray-500 backdrop-blur-sm transition-all focus:outline-none focus:ring-2 ${
                    errors.email
                      ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/50 bg-white/5"
                      : "border-white/10 bg-white/5 focus:border-green-500/50 focus:ring-green-500/50"
                  }`}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  required
                  autoComplete="email"
                />
              </div>
              {errors.email && <p id="email-error" className="mt-1 text-xs text-red-400" role="alert">{errors.email}</p>}
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
                  required
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
                Confirm Password
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
                  placeholder="Re-enter your password"
                  className={`w-full rounded-lg border py-3 pl-11 pr-11 text-white placeholder-gray-500 backdrop-blur-sm transition-all focus:outline-none focus:ring-2 ${
                    errors.confirmPassword
                      ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/50 bg-white/5"
                      : "border-white/10 bg-white/5 focus:border-green-500/50 focus:ring-green-500/50"
                  }`}
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                  required
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

            <div>
              <label className="group flex cursor-pointer items-start gap-3 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => {
                    setAcceptTerms(e.target.checked);
                    if (errors.terms) setErrors((p) => ({ ...p, terms: "" }));
                  }}
                  className="mt-1 h-5 w-5 min-h-[20px] min-w-[20px] cursor-pointer rounded border-white/20 bg-white/5 text-green-500 focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-black/80"
                  aria-invalid={!!errors.terms}
                  aria-describedby={errors.terms ? "terms-error" : undefined}
                />
                <span className="transition-colors group-hover:text-gray-300">
                  I agree to the{" "}
                  <a href="#" className="text-green-400 hover:text-green-300">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-green-400 hover:text-green-300">
                    Privacy Policy
                  </a>
                </span>
              </label>
              {errors.terms && <p id="terms-error" className="mt-1 text-xs text-red-400" role="alert">{errors.terms}</p>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="group relative w-full min-h-[44px] overflow-hidden rounded-lg bg-gradient-to-r from-green-400 to-emerald-500 px-4 py-3 font-semibold text-black transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-black/80 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              <span className="relative z-10">{submitting ? "Creating Account…" : "Create Account"}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-green-300 to-emerald-400 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-green-400 transition-colors hover:text-green-300">
              Sign in
            </Link>
          </div>

          <div className="mt-6 border-t border-white/10 pt-6">
            <div className="flex items-start gap-3 text-xs text-gray-500">
              <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400/50" />
              <p>
                Your data is protected with enterprise-grade encryption. We never share your information with
                third parties.
              </p>
            </div>
          </div>
          </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
