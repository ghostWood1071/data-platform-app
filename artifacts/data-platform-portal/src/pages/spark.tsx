import { useState } from "react";
import { 
  useGetSparkCluster, 
  useGetSparkPods, 
  useStartSparkCluster, 
  useStopSparkCluster, 
  useScaleSparkCluster 
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Square, Minus, Plus, Settings2, ExternalLink, AlertTriangle } from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { MOCK_SPARK_CLUSTER, MOCK_SPARK_PODS } from "@/data/mock";

export default function SparkCluster() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  
  const { data: clusterData, isLoading: clusterLoading } = useGetSparkCluster();
  const { data: podsData, isLoading: podsLoading } = useGetSparkPods();
  
  const startMutation = useStartSparkCluster();
  const stopMutation = useStopSparkCluster();
  const scaleMutation = useScaleSparkCluster();

  const cluster = clusterData || MOCK_SPARK_CLUSTER;
  const pods = podsData || MOCK_SPARK_PODS;

  const [workerInput, setWorkerInput] = useState(cluster.desiredWorkerReplicas.toString());
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  const canManage = hasPermission("cluster.spark.start"); // simplifying to check if they have manage rights

  const handleStart = async () => {
    try {
      await startMutation.mutateAsync({});
      toast({ title: "Spark cluster started successfully" });
    } catch (e) {
      toast({ title: "Started cluster (Mock)", description: "Backend not connected." });
    }
  };

  const handleStop = async () => {
    setShowStopConfirm(false);
    try {
      await stopMutation.mutateAsync({});
      toast({ title: "Spark cluster stopped successfully" });
    } catch (e) {
      toast({ title: "Stopped cluster (Mock)", description: "Backend not connected." });
    }
  };

  const handleScale = async (count: number) => {
    setWorkerInput(count.toString());
    try {
      await scaleMutation.mutateAsync({ data: { workerCount: count } });
      toast({ title: "Worker count updated successfully" });
    } catch (e) {
      toast({ title: `Scaled to ${count} workers (Mock)`, description: "Backend not connected." });
    }
  };

  return (
    <ProtectedRoute permission="cluster.spark.view">
      <Layout>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Spark Cluster</h1>
            <p className="text-muted-foreground">Manage distributed compute resources</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => window.open(cluster.sparkUiUrl, '_blank')} className="gap-2">
              <ExternalLink size={16} />
              Open Spark UI
            </Button>
            {canManage && (
              <>
                <Button 
                  variant="secondary" 
                  onClick={handleStart}
                  disabled={cluster.masterStatus === "Running" || startMutation.isPending}
                  className="gap-2 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                >
                  <Play size={16} />
                  Start
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => setShowStopConfirm(true)}
                  disabled={cluster.masterStatus === "Stopped" || stopMutation.isPending}
                  className="gap-2"
                >
                  <Square size={16} />
                  Stop
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cluster Status</CardTitle>
            </CardHeader>
            <CardContent>
              {clusterLoading ? <Skeleton className="h-8 w-24" /> : (
                <div className="flex items-center gap-2 text-2xl font-bold">
                  <StatusBadge status={cluster.masterStatus} />
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Workers</CardTitle>
            </CardHeader>
            <CardContent>
              {clusterLoading ? <Skeleton className="h-8 w-24" /> : (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{cluster.currentWorkerReplicas}</span>
                  <span className="text-sm text-muted-foreground">/ {cluster.desiredWorkerReplicas} active</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Connection</CardTitle>
            </CardHeader>
            <CardContent>
              {clusterLoading ? <Skeleton className="h-8 w-full" /> : (
                <div className="text-sm font-mono bg-muted p-2 rounded truncate" title={cluster.sparkMasterUrl}>
                  {cluster.sparkMasterUrl}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Cluster Pods</CardTitle>
              <CardDescription>Real-time status of all master and worker nodes</CardDescription>
            </CardHeader>
            <CardContent>
              {podsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pod Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Resources</TableHead>
                        <TableHead>Age</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pods.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No pods currently running
                          </TableCell>
                        </TableRow>
                      ) : (
                        pods.map(pod => (
                          <TableRow key={pod.podName}>
                            <TableCell className="font-medium">{pod.podName}</TableCell>
                            <TableCell className="capitalize">{pod.role}</TableCell>
                            <TableCell><StatusBadge status={pod.status} /></TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {pod.cpu} CPU / {pod.memory} RAM
                            </TableCell>
                            <TableCell>{pod.age}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 size={18} />
                  Scale Cluster
                </CardTitle>
                <CardDescription>Adjust worker count</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Desired Workers</label>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => handleScale(Math.max(0, parseInt(workerInput) - 1))}
                    >
                      <Minus size={16} />
                    </Button>
                    <Input 
                      type="number" 
                      min="0" 
                      max="20"
                      value={workerInput}
                      onChange={(e) => setWorkerInput(e.target.value)}
                      className="text-center font-mono"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => handleScale(parseInt(workerInput) + 1)}
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => handleScale(parseInt(workerInput))}
                  disabled={scaleMutation.isPending || parseInt(workerInput) === cluster.desiredWorkerReplicas}
                >
                  Apply Changes
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <AlertDialog open={showStopConfirm} onOpenChange={setShowStopConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle size={20} />
                Stop Spark Cluster?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will terminate all running pods and interrupt any active jobs. 
                Are you sure you want to proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleStop} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Stop Cluster
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </Layout>
    </ProtectedRoute>
  );
}
