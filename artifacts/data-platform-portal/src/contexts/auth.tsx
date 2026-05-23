import React, { createContext, useContext, useState, useEffect } from "react";
import type { User } from "@workspace/api-client-react";
import { MOCK_USERS, MOCK_ROLES } from "../data/mock";

interface AuthUser extends User {
  permissions: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password?: string) => Promise<AuthUser>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("platform_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem("platform_user");
      }
    }
  }, []);

  const login = async (username: string, password?: string): Promise<AuthUser> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const found = MOCK_USERS.find(u => u.username === username);
        // Using mock passwords: username == password
        if (found && (!password || password === username)) {
          const role = MOCK_ROLES.find(r => r.name === found.role);
          const permissions = role ? role.permissions : [];
          const authUser: AuthUser = { ...found, permissions };
          setUser(authUser);
          localStorage.setItem("platform_user", JSON.stringify(authUser));
          resolve(authUser);
        } else {
          reject(new Error("Invalid credentials"));
        }
      }, 500);
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("platform_user");
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
    <AuthContext.Provider value={{ user, login, logout, hasPermission }}>
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
