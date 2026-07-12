import React from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Server, 
  Box, 
  Users, 
  Info,
  LogOut,
  ChevronDown,
  Activity
} from "lucide-react";
import { useAuth } from "@/contexts/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, logout, hasPermission } = useAuth();

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
    { name: "Spark Cluster", href: "/spark", icon: Server, permission: "cluster.spark.view" },
    { name: "Services", href: "/services", icon: Box, permission: "service.minio.open" }, // Using minio as a proxy for "any service"
    { name: "Users & Roles", href: "/users", icon: Users, permission: "user.view" },
    { name: "About", href: "/about", icon: Info, permission: "about.view" },
  ];

  // Adjust Services permission check
  const visibleNavItems = navItems.filter(item => {
    if (item.name === "Services") {
      // Show if they have ANY service permission
      return hasPermission("service.minio.open") || 
             hasPermission("service.notebook.open") || 
             hasPermission("service.airflow.open") || 
             hasPermission("service.kafka.open") || 
             hasPermission("service.openmetadata.open") ||
             hasPermission("*");
    }
    if (item.name === "Users & Roles") {
      return hasPermission("user.view");
    }
    return hasPermission(item.permission) || hasPermission("*");
  });

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-sidebar border-r border-sidebar-border flex flex-col flex-shrink-0">
        <div className="p-4 md:p-6 border-b border-sidebar-border/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
              <Activity size={18} />
            </div>
            <span className="font-semibold text-sidebar-foreground tracking-tight">Data Platform</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const isActive = location === item.href || location.startsWith(`${item.href}/`);
            return (
              <Link key={item.name} href={item.href} className="block">
                <div className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}>
                  <item.icon size={18} />
                  <span>{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border/50 text-xs text-sidebar-foreground/50">
          <p>Env: Production</p>
          <p>Version: 1.2.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0 z-10 sticky top-0">
          <h1 className="text-lg font-medium tracking-tight">
            {visibleNavItems.find(item => location === item.href)?.name || "Data Platform Portal"}
          </h1>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 outline-none">
                <Avatar className="h-8 w-8 bg-muted text-muted-foreground border">
                  <AvatarFallback className="text-xs">{user?.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start text-sm">
                  <span className="font-medium leading-none">{user?.fullName}</span>
                  <span className="text-xs text-muted-foreground mt-1">{user?.role}</span>
                </div>
                <ChevronDown size={14} className="text-muted-foreground hidden md:block" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.fullName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto bg-background/50">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
