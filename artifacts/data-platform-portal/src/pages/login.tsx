import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Activity, LogIn } from "lucide-react";

export default function Login() {
  const [error, setError] = useState("");
  const [isStartingLogin, setIsStartingLogin] = useState(false);
  const { login, user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      const params = new URLSearchParams(window.location.search);
      setLocation(params.get("redirect") || "/dashboard");
    }
  }, [isLoading, setLocation, user]);

  const handleSsoLogin = async () => {
    setError("");
    setIsStartingLogin(true);

    try {
      const params = new URLSearchParams(window.location.search);
      await login(params.get("redirect") || "/dashboard");
    } catch {
      setError("Unable to start Keycloak sign in.");
      setIsStartingLogin(false);
    }
  };

  return (
    <div className="min-h-screen bg-sidebar flex flex-col justify-center items-center p-4">
      <div className="mb-8 flex flex-col items-center">
        <div className="w-12 h-12 rounded bg-primary flex items-center justify-center text-primary-foreground shadow-lg mb-4">
          <Activity size={24} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Data Platform Portal
        </h1>
        <p className="text-sidebar-foreground/70 mt-2 text-sm">
          Mission control for your data infrastructure
        </p>
      </div>

      <Card className="w-full max-w-sm shadow-xl border-sidebar-border/20">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Continue with your Keycloak account.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md border border-destructive/20">
              {error}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            className="w-full gap-2"
            type="button"
            disabled={isLoading || isStartingLogin}
            onClick={handleSsoLogin}
          >
            <LogIn size={16} />
            {isLoading || isStartingLogin ? "Connecting..." : "Sign in with Keycloak"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
