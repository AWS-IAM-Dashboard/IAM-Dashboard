import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { DashboardApp } from "./pages/DashboardApp";
import { AboutPage } from "./pages/AboutPage";

function AppRouter() {
  const auth = useAuth();

  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-lg font-medium">Loading authentication...</p>
          <p className="mt-2 text-sm text-gray-400">Checking your session.</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/login" element={auth.isAuthenticated ? <Navigate replace to="/app" /> : <LoginPage />} />
      <Route path="/app" element={auth.isAuthenticated ? <DashboardApp /> : <Navigate replace to="/login" />} />
      <Route path="/dashboard" element={<Navigate replace to="/app" />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
<<<<<<< HEAD
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/app" element={<DashboardApp />} />
        <Route path="/dashboard" element={<Navigate replace to="/app" />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
=======
      <AppRouter />
>>>>>>> 66239f3c73c77c3cb969ecc789ed234653bad1cd
    </BrowserRouter>
  );
}
