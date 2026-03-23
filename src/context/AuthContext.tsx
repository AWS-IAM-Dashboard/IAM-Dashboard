import { createContext, useContext, useEffect, useMemo, useState } from "react";

type AuthProfile = Record<string, unknown>;

type AuthUser = {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: number;
  profile: AuthProfile;
};

type AuthContextValue = {
  error: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
  user: AuthUser | null;
};

type CognitoAuthResponse = {
  AuthenticationResult?: {
    AccessToken?: string;
    ExpiresIn?: number;
    IdToken?: string;
    RefreshToken?: string;
    TokenType?: string;
  };
  ChallengeName?: string;
  message?: string;
  __type?: string;
};

const SESSION_STORAGE_KEY = "iam-dashboard-auth-session";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function decodeJwtPayload(token: string): AuthProfile {
  const [, payload] = token.split(".");
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return JSON.parse(atob(padded));
}

function getCognitoRegion(authority: string): string {
  const hostnameParts = new URL(authority).hostname.split(".");
  return hostnameParts[1] ?? "us-east-1";
}

function getAuthEndpoint(authority: string): string {
  return `https://cognito-idp.${getCognitoRegion(authority)}.amazonaws.com/`;
}

async function initiateAuth(
  endpoint: string,
  body: Record<string, unknown>
): Promise<CognitoAuthResponse> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth"
    },
    body: JSON.stringify(body)
  });

  const payload = (await response.json()) as CognitoAuthResponse;

  if (!response.ok) {
    const message = payload.message || payload.__type || "Authentication request failed.";
    throw new Error(message);
  }

  if (payload.ChallengeName) {
    if (payload.ChallengeName === "NEW_PASSWORD_REQUIRED") {
      throw new Error(
        "Your password must be changed before you can continue. Please contact an administrator or use the password reset flow."
      );
    }

    throw new Error("This Cognito sign-in challenge is not supported yet. Please contact an administrator.");
  }

  return payload;
}

function buildUser(
  authResult: NonNullable<CognitoAuthResponse["AuthenticationResult"]>,
  existingRefreshToken?: string
): AuthUser {
  if (!authResult.AccessToken || !authResult.IdToken) {
    throw new Error("Cognito did not return the required tokens.");
  }

  const profile = decodeJwtPayload(authResult.IdToken);
  const expiresAt =
    typeof authResult.ExpiresIn === "number"
      ? Date.now() + authResult.ExpiresIn * 1000
      : ((profile.exp as number | undefined) ?? 0) * 1000;

  const refreshToken = authResult.RefreshToken || existingRefreshToken;
  if (!refreshToken) {
    throw new Error("Cognito did not return a refresh token.");
  }

  return {
    accessToken: authResult.AccessToken,
    idToken: authResult.IdToken,
    refreshToken,
    tokenType: authResult.TokenType || "Bearer",
    expiresAt,
    profile
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const authority = import.meta.env.VITE_COGNITO_AUTHORITY;
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
  const endpoint = getAuthEndpoint(authority);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const restoreSession = async () => {
      const storedSession = window.localStorage.getItem(SESSION_STORAGE_KEY);

      if (!storedSession) {
        setIsLoading(false);
        return;
      }

      try {
        const parsedUser = JSON.parse(storedSession) as AuthUser;

        if (parsedUser.expiresAt > Date.now()) {
          setUser(parsedUser);
          setError(null);
          setIsLoading(false);
          return;
        }

        const refreshed = await initiateAuth(endpoint, {
          AuthFlow: "REFRESH_TOKEN_AUTH",
          ClientId: clientId,
          AuthParameters: {
            REFRESH_TOKEN: parsedUser.refreshToken
          }
        });

        const nextUser = buildUser(refreshed.AuthenticationResult ?? {}, parsedUser.refreshToken);
        window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextUser));
        setUser(nextUser);
        setError(null);
      } catch {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
        setUser(null);
        setError(null);
      } finally {
        setIsLoading(false);
      }
    };

    void restoreSession();
  }, [clientId, endpoint]);

  const value = useMemo<AuthContextValue>(
    () => ({
      error,
      isAuthenticated: user !== null,
      isLoading,
      signIn: async (username: string, password: string) => {
        setError(null);

        try {
          const response = await initiateAuth(endpoint, {
            AuthFlow: "USER_PASSWORD_AUTH",
            ClientId: clientId,
            AuthParameters: {
              USERNAME: username,
              PASSWORD: password
            }
          });

          const nextUser = buildUser(response.AuthenticationResult ?? {});
          window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextUser));
          setUser(nextUser);
          setError(null);
        } catch (signInError) {
          const message =
            signInError instanceof Error ? signInError.message : "Unable to sign in with Cognito.";
          setUser(null);
          throw new Error(message);
        }
      },
      signOut: () => {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
        setUser(null);
        setError(null);
      },
      user
    }),
    [clientId, endpoint, error, isLoading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within the custom AuthProvider.");
  }

  return context;
}
