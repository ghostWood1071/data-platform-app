import React, { createContext, useContext, useState, useEffect } from "react";
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  setAuthTokenGetter,
  type User,
} from "@workspace/api-client-react";
import { MOCK_ROLES } from "../data/mock";

interface AuthUser extends User {
  permissions: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password?: string, rememberMe?: boolean) => Promise<AuthUser>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);
const TOKEN_KEY = "platform_auth_token";
const USER_KEY = "platform_user";

setAuthTokenGetter(() => localStorage.getItem(TOKEN_KEY));

function attachPermissions(user: User): AuthUser {
  const role = MOCK_ROLES.find((r) => r.name === user.role);
  return { ...user, permissions: role ? role.permissions : [] };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
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
  const [isLoading, setIsLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }

    getCurrentUser()
      .then((currentUser) => {
        const authUser = attachPermissions(currentUser);
        setUser(authUser);
        localStorage.setItem(USER_KEY, JSON.stringify(authUser));
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (
    username: string,
    password?: string,
    rememberMe?: boolean,
  ): Promise<AuthUser> => {
    const response = await loginRequest({
      username,
      password: password || "",
      rememberMe,
    });
    localStorage.setItem(TOKEN_KEY, response.token);
    const authUser = attachPermissions(response.user);
    setUser(authUser);
    localStorage.setItem(USER_KEY, JSON.stringify(authUser));
    return authUser;
  };

  const logout = () => {
    void logoutRequest().catch(() => undefined);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.permissions.includes("*")) return true;
    
    // Check wildcard prefixes, e.g., service.*.open
    if (permission.startsWith("service.") && permission.endsWith(".open")) {
      return user.permissions.some(p => p.startsWith("service.") && p.endsWith(".open") || p === "*");
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
