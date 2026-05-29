import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSparkClustersList,
  startSparkClusterAction,
  stopSparkClusterAction,
  resizeSparkClusterAction,
  getSparkClusterOperationsList,
  getSparkClusterSettings,
  updateSparkClusterSettings,
  type SparkReleaseName,
  type UpdateSparkClusterSettingsRequest,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth";
import { StatusBadge } from "@/components/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Play,
  Square,
  Server,
  Terminal,
  Clock,
  ExternalLink,
  Settings,
  Save,
} from "lucide-react";

const CLUSTER_DISPLAY_NAMES: Record<string, string> = {
  "data-exp-small": "Small Cluster",
  "data-exp-medium": "Medium Cluster",
  "data-exp-large": "Large Cluster",
};

export default function SparkClusterPage() {
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [selectedReleaseName, setSelectedReleaseName] =
    useState<SparkReleaseName>("data-exp-small");
  const [resizeValue, setResizeValue] = useState<number>(1);
  const [settingsForm, setSettingsForm] =
    useState<UpdateSparkClusterSettingsRequest | null>(null);

  // Queries
  const { data: clusters, isLoading: clustersLoading } = useQuery({
    queryKey: ["spark-clusters"],
    queryFn: getSparkClustersList,
    refetchInterval: 5000,
  });

  const { data: operations, isLoading: opsLoading } = useQuery({
    queryKey: ["spark-operations", selectedReleaseName],
    queryFn: () => getSparkClusterOperationsList(selectedReleaseName),
    refetchInterval: 3000,
  });

  const { data: sparkSettings } = useQuery({
    queryKey: ["spark-settings"],
    queryFn: getSparkClusterSettings,
  });

  const selectedCluster = useMemo(
    () => clusters?.find((c) => c.releaseName === selectedReleaseName),
    [clusters, selectedReleaseName],
  );

  useEffect(() => {
    if (selectedCluster) {
      setResizeValue(selectedCluster.workerReplicas || 1);
    }
  }, [selectedCluster?.releaseName]);

  useEffect(() => {
    if (sparkSettings) {
      setSettingsForm({
        computeNamespace: sparkSettings.computeNamespace,
        sparkClusterImage: sparkSettings.sparkClusterImage,
        sparkVersion: sparkSettings.sparkVersion,
        pysparkVersion: sparkSettings.pysparkVersion,
        hiveMetastoreUris: sparkSettings.hiveMetastoreUris,
        s3aEndpoint: sparkSettings.s3aEndpoint,
        sparkWarehouseDir: sparkSettings.sparkWarehouseDir,
        awsAccessKeyId: sparkSettings.awsAccessKeyId,
        awsSecretAccessKey: sparkSettings.awsSecretAccessKey,
      });
    }
  }, [sparkSettings]);

  // Mutations
  const startMutation = useMutation({
    mutationFn: (size: any) =>
      startSparkClusterAction(selectedReleaseName, { size }),
    onSuccess: (res) => {
      toast({
        title: "Start operation accepted",
        description: `Operation ID: ${res.operationId}`,
      });
      queryClient.invalidateQueries({
        queryKey: ["spark-operations", selectedReleaseName],
      });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to start cluster",
        description: err.message,
        variant: "destructive",
      }),
  });

  const stopMutation = useMutation({
    mutationFn: () => stopSparkClusterAction(selectedReleaseName),
    onSuccess: (res) => {
      toast({
        title: "Stop operation accepted",
        description: `Operation ID: ${res.operationId}`,
      });
      queryClient.invalidateQueries({
        queryKey: ["spark-operations", selectedReleaseName],
      });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to stop cluster",
        description: err.message,
        variant: "destructive",
      }),
  });

  const resizeMutation = useMutation({
    mutationFn: (replicas: number) =>
      resizeSparkClusterAction(selectedReleaseName, { replicas }),
    onSuccess: (res) => {
      toast({
        title: "Resize operation accepted",
        description: `Operation ID: ${res.operationId}`,
      });
      queryClient.invalidateQueries({
        queryKey: ["spark-operations", selectedReleaseName],
      });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to resize cluster",
        description: err.message,
        variant: "destructive",
      }),
  });

  const settingsMutation = useMutation({
    mutationFn: (payload: UpdateSparkClusterSettingsRequest) =>
      updateSparkClusterSettings(payload),
    onSuccess: () => {
      toast({ title: "Spark settings saved" });
      queryClient.invalidateQueries({ queryKey: ["spark-settings"] });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to save Spark settings",
        description: err.message,
        variant: "destructive",
      }),
  });

  const isOperationRunning = operations?.some(
    (op) => op.status === "PENDING" || op.status === "RUNNING",
  );
  const canStart = hasPermission("spark_cluster:start");
  const canStop = hasPermission("spark_cluster:stop");
  const canResize = hasPermission("spark_cluster:resize");
  const canEditSettings = hasPermission("spark_cluster:settings");

  function updateSettingsField<K extends keyof UpdateSparkClusterSettingsRequest>(
    field: K,
    value: UpdateSparkClusterSettingsRequest[K],
  ) {
    setSettingsForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  return (
    <ProtectedRoute permission="spark_cluster:view">
      <Layout>
        <div className="flex flex-col gap-6 p-6">
          <div>
            <h1 className="text-3xl font-bold">Spark Clusters</h1>
            <p className="text-muted-foreground">
              Manage your Spark execution environments
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {clustersLoading ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full" />)
            ) : (
              clusters?.map((cluster) => (
                <Card
                  key={cluster.releaseName}
                  className={`cursor-pointer transition-all border-2 ${selectedReleaseName === cluster.releaseName ? "border-primary" : "border-transparent"}`}
                  onClick={() => setSelectedReleaseName(cluster.releaseName)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle>
                        {CLUSTER_DISPLAY_NAMES[cluster.releaseName]}
                      </CardTitle>
                      <StatusBadge
                        status={
                          cluster.status === "RUNNING"
                            ? "Running"
                            : cluster.status === "STOPPED"
                              ? "Stopped"
                              : "Partial"
                        }
                      />
                    </div>
                    <CardDescription>
                      {cluster.releaseName} • {cluster.namespace}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Workers:</span>
                        <span className="font-mono">
                          {cluster.workerReplicas} / {cluster.maxWorkers}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Master:</span>
                        <span className="font-mono">
                          {cluster.masterReplicas}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Connect:</span>
                        <span className="font-mono">
                          {cluster.connectReplicas}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {selectedCluster && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server size={20} />
                      Cluster Control:{" "}
                      {CLUSTER_DISPLAY_NAMES[selectedCluster.releaseName]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-wrap gap-4">
                      <Button
                        size="lg"
                        className="gap-2"
                        disabled={
                          !canStart ||
                          selectedCluster.status === "RUNNING" ||
                          isOperationRunning
                        }
                        onClick={() => startMutation.mutate(selectedCluster.size)}
                      >
                        <Play size={18} /> Start
                      </Button>
                      <Button
                        size="lg"
                        variant="destructive"
                        className="gap-2"
                        disabled={
                          !canStop ||
                          selectedCluster.status === "STOPPED" ||
                          isOperationRunning
                        }
                        onClick={() => stopMutation.mutate()}
                      >
                        <Square size={18} /> Stop
                      </Button>
                    </div>

                    <div className="pt-4 border-t space-y-4">
                      <Label className="text-lg">Resize Workers</Label>
                      {selectedCluster.status === "STOPPED" && (
                        <p className="text-amber-500 text-sm flex items-center gap-1">
                          Note: Cluster is stopped. Resizing will only update
                          worker count, not start the cluster.
                        </p>
                      )}
                      <div className="flex items-center gap-4">
                        <Input
                          type="number"
                          className="w-32"
                          min={0}
                          max={selectedCluster.maxWorkers}
                          value={resizeValue}
                          onChange={(e) =>
                            setResizeValue(parseInt(e.target.value))
                          }
                        />
                        <Button
                          variant="outline"
                          disabled={!canResize || isOperationRunning}
                          onClick={() => resizeMutation.mutate(resizeValue)}
                        >
                          Update Worker Count
                        </Button>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <Label className="text-muted-foreground">
                        Connect Endpoint
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="bg-muted p-2 rounded flex-1 text-sm">
                          {selectedCluster.sparkConnectEndpoint}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open(
                              selectedCluster.sparkConnectEndpoint,
                              "_blank",
                            )
                          }
                        >
                          <ExternalLink size={14} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock size={20} />
                      Operation History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Action</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Started At</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Result</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {opsLoading ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center">
                              Loading...
                            </TableCell>
                          </TableRow>
                        ) : operations?.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-center text-muted-foreground"
                            >
                              No operations found
                            </TableCell>
                          </TableRow>
                        ) : (
                          operations?.map((op) => (
                            <TableRow key={op.id}>
                              <TableCell className="font-bold">
                                {op.action}
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={op.status} />
                              </TableCell>
                              <TableCell>
                                {op.startedAt
                                  ? new Date(op.startedAt).toLocaleString()
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                {op.finishedAt && op.startedAt
                                  ? `${Math.round((new Date(op.finishedAt).getTime() - new Date(op.startedAt).getTime()) / 1000)}s`
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                {op.status === "SUCCESS" ||
                                op.status === "FAILED" ? (
                                  <Button
                                    variant="link"
                                    size="sm"
                                    onClick={() =>
                                      window.alert(
                                        `STDOUT: ${op.stdout}\n\nSTDERR: ${op.stderr}`,
                                      )
                                    }
                                  >
                                    View Log
                                  </Button>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings size={20} />
                      Spark Settings
                    </CardTitle>
                    <CardDescription>
                      Values saved here are passed to cluster scripts from the
                      database.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {settingsForm ? (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label>Compute Namespace</Label>
                          <Input
                            value={settingsForm.computeNamespace}
                            disabled={!canEditSettings}
                            onChange={(e) =>
                              updateSettingsField(
                                "computeNamespace",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Spark Cluster Image</Label>
                          <Input
                            value={settingsForm.sparkClusterImage}
                            disabled={!canEditSettings}
                            onChange={(e) =>
                              updateSettingsField(
                                "sparkClusterImage",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label>Spark Version</Label>
                            <Input
                              value={settingsForm.sparkVersion}
                              disabled={!canEditSettings}
                              onChange={(e) =>
                                updateSettingsField(
                                  "sparkVersion",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>PySpark Version</Label>
                            <Input
                              value={settingsForm.pysparkVersion}
                              disabled={!canEditSettings}
                              onChange={(e) =>
                                updateSettingsField(
                                  "pysparkVersion",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label>Hive Metastore URIs</Label>
                          <Input
                            value={settingsForm.hiveMetastoreUris}
                            disabled={!canEditSettings}
                            onChange={(e) =>
                              updateSettingsField(
                                "hiveMetastoreUris",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>S3A Endpoint</Label>
                          <Input
                            value={settingsForm.s3aEndpoint}
                            disabled={!canEditSettings}
                            onChange={(e) =>
                              updateSettingsField("s3aEndpoint", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Spark Warehouse Dir</Label>
                          <Input
                            value={settingsForm.sparkWarehouseDir}
                            disabled={!canEditSettings}
                            onChange={(e) =>
                              updateSettingsField(
                                "sparkWarehouseDir",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label>AWS Access Key ID</Label>
                            <Input
                              value={settingsForm.awsAccessKeyId}
                              disabled={!canEditSettings}
                              onChange={(e) =>
                                updateSettingsField(
                                  "awsAccessKeyId",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>AWS Secret Access Key</Label>
                            <Input
                              type="password"
                              value={settingsForm.awsSecretAccessKey}
                              disabled={!canEditSettings}
                              onChange={(e) =>
                                updateSettingsField(
                                  "awsSecretAccessKey",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        </div>
                        <Button
                          className="w-full gap-2"
                          disabled={!canEditSettings || settingsMutation.isPending}
                          onClick={() => settingsMutation.mutate(settingsForm)}
                        >
                          <Save size={16} />
                          Save Settings
                        </Button>
                      </div>
                    ) : (
                      <Skeleton className="h-64 w-full" />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Terminal size={20} />
                      Last Operation Log
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {operations && operations.length > 0 ? (
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs uppercase text-muted-foreground">
                            Status
                          </Label>
                          <div className="mt-1 font-bold">
                            {operations[0].status}
                          </div>
                        </div>
                        {operations[0].errorMessage && (
                          <div className="p-2 bg-destructive/10 text-destructive text-sm rounded border border-destructive/20">
                            {operations[0].errorMessage}
                          </div>
                        )}
                        <div>
                          <Label className="text-xs uppercase text-muted-foreground">
                            Stdout
                          </Label>
                          <pre className="mt-1 p-2 bg-black text-green-400 text-xs overflow-auto max-h-40 rounded">
                            {operations[0].stdout || "no output"}
                          </pre>
                        </div>
                        <div>
                          <Label className="text-xs uppercase text-muted-foreground">
                            Stderr
                          </Label>
                          <pre className="mt-1 p-2 bg-black text-red-400 text-xs overflow-auto max-h-40 rounded">
                            {operations[0].stderr || "no errors"}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No recent operation logs.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
