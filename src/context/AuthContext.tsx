import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSession, login, logout, type AuthUser } from "../services/auth";

// Shared auth state exposed to the rest of the application.
type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DATA_MODE = (import.meta.env.VITE_DATA_MODE || "live").toLowerCase();
const IS_MOCK_MODE = import.meta.env.DEV && DATA_MODE === "mock";

// Loads the browser-backed session once on app startup and exposes shared auth state.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (IS_MOCK_MODE) {
      setUser({ username: "mock-user", groups: ["admin"] });
      setError(null);
      setIsLoading(false);
      return;
    }

    // Restore app auth state from the server-side session cookie if one exists.
    const restoreSession = async () => {
      try {
        const session = await getSession();

        if (session.authenticated && session.user) {
          setUser(session.user);
          setError(null);
        } else {
          setUser(null);
          setError(null);
        }
      } catch {
        setUser(null);
        setError(null);
      } finally {
        setIsLoading(false);
      }
    };

    void restoreSession();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      error,
      signIn: async (username: string, password: string) => {
        setError(null);

        try {
          const response = await login(username, password);
          setUser(response.user);
          setError(null);
        } catch (signInError) {
          const message =
            signInError instanceof Error ? signInError.message : "Unable to sign in.";
          setUser(null);
          setError(message);
          throw new Error(message);
        }
      },
      signOut: async () => {
        try {
          const response = await logout();
          if (!response.session_cleared) {
            throw new Error("Failed to clear session.");
          }

          setUser(null);
          setError(null);
        } catch {
          setError("Failed to clear session.");
          throw new Error("Failed to clear session.");
        }
      },
    }),
    [error, isLoading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Returns the shared auth context and enforces provider usage.
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within the AuthProvider.");
  }

  return context;
}
