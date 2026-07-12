import React from "react";
import { useAuth } from "@/contexts/auth";
import { Redirect, useLocation } from "wouter";

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: string;
}

export function ProtectedRoute({ children, permission }: ProtectedRouteProps) {
  const { user, isLoading, hasPermission } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to={`/login?redirect=${encodeURIComponent(location)}`} />;
  }

  if (permission && !hasPermission(permission)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-2xl font-bold tracking-tight mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-6">You don't have permission to view this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
