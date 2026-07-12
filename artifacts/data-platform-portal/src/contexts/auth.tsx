import React, { createContext, useContext, useEffect, useState } from "react";
import {
  getCurrentUser,
  logout as logoutRequest,
  setAuthTokenGetter,
  type User,
} from "@workspace/api-client-react";
import { MOCK_ROLES } from "../data/mock";

type AuthConfig = {
  issuer: string;
  clientId: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  endSessionEndpoint: string;
  scope: string;
};

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
};

interface AuthUser extends User {
  permissions: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (redirectTo?: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);
const ACCESS_TOKEN_KEY = "platform_access_token";
const REFRESH_TOKEN_KEY = "platform_refresh_token";
const ID_TOKEN_KEY = "platform_id_token";
const TOKEN_EXPIRES_AT_KEY = "platform_token_expires_at";
const USER_KEY = "platform_user";
const OIDC_STATE_KEY = "platform_oidc_state";
const OIDC_VERIFIER_KEY = "platform_oidc_verifier";
const OIDC_REDIRECT_KEY = "platform_oidc_redirect";

let authConfigPromise: Promise<AuthConfig> | null = null;

setAuthTokenGetter(() => getValidAccessToken());

function apiUrl(path: string) {
  const baseUrl = import.meta.env.VITE_API_URL || "";
  return `${baseUrl}${path}`;
}

async function fetchAuthConfig() {
  if (!authConfigPromise) {
    authConfigPromise = fetch(apiUrl("/api/auth/config")).then(async (response) => {
      if (!response.ok) {
        throw new Error("Keycloak SSO is not configured");
      }
      return (await response.json()) as AuthConfig;
    });
  }

  return authConfigPromise;
}

function attachPermissions(user: User): AuthUser {
  const role = MOCK_ROLES.find((r) => r.name === user.role);
  return { ...user, permissions: role ? role.permissions : [] };
}

function clearStoredAuth() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ID_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
  localStorage.removeItem(USER_KEY);
}

function storeTokens(tokens: TokenResponse) {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  if (tokens.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  }
  if (tokens.id_token) {
    localStorage.setItem(ID_TOKEN_KEY, tokens.id_token);
  }

  const expiresAt = Date.now() + (tokens.expires_in ?? 300) * 1000;
  localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(expiresAt));
}

function getStoredAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

async function refreshAccessToken(config?: AuthConfig) {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  const authConfig = config ?? (await fetchAuthConfig());
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: authConfig.clientId,
    refresh_token: refreshToken,
  });

  const response = await fetch(authConfig.tokenEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    clearStoredAuth();
    return null;
  }

  const tokens = (await response.json()) as TokenResponse;
  storeTokens(tokens);
  return tokens.access_token;
}

async function getValidAccessToken(config?: AuthConfig) {
  const token = getStoredAccessToken();
  if (!token) return null;

  const expiresAt = Number(localStorage.getItem(TOKEN_EXPIRES_AT_KEY) || "0");
  if (expiresAt > Date.now() + 60_000) {
    return token;
  }

  return refreshAccessToken(config);
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function randomVerifier() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function createCodeChallenge(verifier: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64UrlEncode(new Uint8Array(digest));
}

function callbackUrl() {
  return `${window.location.origin}/login`;
}

async function exchangeCodeForTokens(config: AuthConfig, code: string) {
  const verifier = sessionStorage.getItem(OIDC_VERIFIER_KEY);
  if (!verifier) throw new Error("Missing OIDC verifier");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    code,
    redirect_uri: callbackUrl(),
    code_verifier: verifier,
  });

  const response = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) throw new Error("Failed to complete Keycloak login");

  const tokens = (await response.json()) as TokenResponse;
  storeTokens(tokens);
  sessionStorage.removeItem(OIDC_STATE_KEY);
  sessionStorage.removeItem(OIDC_VERIFIER_KEY);
}

async function completeLoginIfNeeded(config: AuthConfig) {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) return;

  const expectedState = sessionStorage.getItem(OIDC_STATE_KEY);
  if (!expectedState || expectedState !== state) {
    throw new Error("Invalid OIDC state");
  }

  await exchangeCodeForTokens(config, code);
  const redirect = sessionStorage.getItem(OIDC_REDIRECT_KEY) || "/dashboard";
  sessionStorage.removeItem(OIDC_REDIRECT_KEY);
  window.history.replaceState(null, "", redirect);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (!getStoredAccessToken()) {
      localStorage.removeItem(USER_KEY);
      return null;
    }
    const savedUser = localStorage.getItem(USER_KEY);
    if (!savedUser) return null;
    try {
      return JSON.parse(savedUser) as AuthUser;
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const config = await fetchAuthConfig();
        await completeLoginIfNeeded(config);
        const token = await getValidAccessToken(config);
        if (!token) {
          clearStoredAuth();
          if (!cancelled) setUser(null);
          return;
        }

        const currentUser = await getCurrentUser();
        const authUser = attachPermissions(currentUser);
        if (!cancelled) {
          setUser(authUser);
          localStorage.setItem(USER_KEY, JSON.stringify(authUser));
        }
      } catch {
        clearStoredAuth();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (redirectTo?: string) => {
    const config = await fetchAuthConfig();
    const state = randomVerifier();
    const verifier = randomVerifier();
    const challenge = await createCodeChallenge(verifier);
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: callbackUrl(),
      response_type: "code",
      scope: config.scope,
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    });

    sessionStorage.setItem(OIDC_STATE_KEY, state);
    sessionStorage.setItem(OIDC_VERIFIER_KEY, verifier);
    sessionStorage.setItem(OIDC_REDIRECT_KEY, redirectTo || "/dashboard");
    window.location.assign(`${config.authorizationEndpoint}?${params.toString()}`);
  };

  const logout = () => {
    void logoutRequest().catch(() => undefined);
    setUser(null);
    const idToken = localStorage.getItem(ID_TOKEN_KEY);
    clearStoredAuth();

    void fetchAuthConfig()
      .then((config) => {
        const params = new URLSearchParams({
          client_id: config.clientId,
          post_logout_redirect_uri: `${window.location.origin}/login`,
        });
        if (idToken) params.set("id_token_hint", idToken);
        window.location.assign(`${config.endSessionEndpoint}?${params.toString()}`);
      })
      .catch(() => undefined);
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.permissions.includes("*")) return true;

    if (permission.startsWith("service.") && permission.endsWith(".open")) {
      return (
        user.permissions.includes(permission) ||
        user.permissions.includes("service.*.open")
      );
    }

    return user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
