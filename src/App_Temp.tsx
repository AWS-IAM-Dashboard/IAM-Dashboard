import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { DashboardApp } from "./pages/DashboardApp";
import { AboutPage } from "./pages/AboutPage";

function AppRouter() {
  const auth = useAuth();

  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-lg font-medium">Loading authentication...</p>
          <p className="mt-2 text-sm text-gray-400">Checking your Cognito session.</p>
        </div>
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="max-w-md rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <p className="text-lg font-medium text-red-200">Authentication failed</p>
          <p className="mt-2 text-sm text-red-100/80">{auth.error}</p>
        </div>
      </div>
    );
  }

  const isAuthenticated = auth.isAuthenticated;

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/login" element={isAuthenticated ? <Navigate replace to="/app" /> : <LoginPage />} />
      <Route path="/app" element={isAuthenticated ? <DashboardApp /> : <Navigate replace to="/login" />} />
      <Route path="/dashboard" element={<Navigate replace to="/app" />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}