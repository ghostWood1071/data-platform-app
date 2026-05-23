import { useGetDashboardSummary } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { ProtectedRoute } from "@/components/protected-route";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Server, Activity, Users, Database } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MOCK_SERVICES, MOCK_AUDIT_LOGS } from "@/data/mock";
import { format } from "date-fns";

export default function Dashboard() {
  const { data, isLoading } = useGetDashboardSummary();

  // Fallback to mock data if API is not wired/loading fails
  const services = data?.services || MOCK_SERVICES;
  const clusterStatus = data?.clusterStatus || "Running";
  const workerCount = data?.workerCount ?? 3;
  const recentActivity = data?.recentActivity || MOCK_AUDIT_LOGS;

  return (
    <ProtectedRoute permission="dashboard.view">
      <Layout>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Spark Cluster</CardTitle>
                <Server className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold mb-1">
                      <StatusBadge status={clusterStatus} />
                    </div>
                    <p className="text-xs text-muted-foreground">{workerCount} active workers</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Platform Services</CardTitle>
                <Database className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{services.filter(s => s.status === "Running").length} / {services.length}</div>
                    <p className="text-xs text-muted-foreground">Services running</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Data Engineers</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">Active in last 24h</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Activity className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">99.9%</div>
                <p className="text-xs text-muted-foreground">Uptime this month</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Core Services</CardTitle>
                <CardDescription>Status overview of primary platform components</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {services.map(service => (
                      <div key={service.name} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{service.name}</span>
                          <span className="text-xs text-muted-foreground">{service.description || ""}</span>
                        </div>
                        <StatusBadge status={service.status} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Platform audit log</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((log) => (
                      <div key={log.id} className="flex flex-col space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{log.actor}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.timestamp), "HH:mm")}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">{log.action}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
