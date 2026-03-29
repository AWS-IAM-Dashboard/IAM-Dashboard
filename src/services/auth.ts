/**
 * Auth Service for IAM Dashboard
 * Handles session-cookie auth calls against the standalone BFF auth API.
 */

const AUTH_API_BASE_URL = import.meta.env.VITE_AUTH_API_URL || "";

// Represents the authenticated user information returned by the auth API.
export interface AuthUser {
  username: string;
  groups: string[];
}

// Successful login response with the authenticated user context.
export interface LoginResponse {
  authenticated: true;
  user: AuthUser;
}

// Logout response indicating whether the server-side session was cleared.
export interface LogoutResponse {
  session_cleared: boolean;
  error?: string;
}

// Session check response for determining whether a browser session is active.
export interface SessionResponse {
  authenticated: boolean;
  user?: AuthUser;
  error?: string;
}

// Minimal error payload shape returned by the auth API on failures.
interface AuthErrorResponse {
  error?: string;
  message?: string;
}

// Sends an auth API request, includes cookies, and normalizes JSON/error handling.
async function authRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${AUTH_API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  let responseData: AuthErrorResponse | T | null = null;
  try {
    responseData = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error("Auth request failed.");
    }
  }

  if (!response.ok) {
    const errorData = (responseData as AuthErrorResponse | null) || {};
    throw new Error(errorData.message || errorData.error || "Auth request failed.");
  }

  return responseData as T;
}

// Starts a session-cookie login by posting username and password to the BFF auth API.
export async function login(username: string, password: string): Promise<LoginResponse> {
  return authRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

// Ends the current session-cookie login state on the server and in the browser.
export async function logout(): Promise<LogoutResponse> {
  return authRequest<LogoutResponse>("/auth/logout", {
    method: "POST",
  });
}

// Checks whether the current browser session cookie maps to an authenticated user.
export async function getSession(): Promise<SessionResponse> {
  return authRequest<SessionResponse>("/auth/session", {
    method: "GET",
  });
}

// Exposes the resolved auth API base URL for debugging or configuration checks.
export function getAuthApiBaseUrl(): string {
  return AUTH_API_BASE_URL;
}
