import { useState, useEffect, useMemo } from "react";
import {
  useGetSparkClusterList,
  useGetSparkClusterByName,
  useStartSparkClusterByName,
  useStopSparkClusterByName,
  useScaleSparkClusterByName,
  useUpdateSparkClusterConfig,
  getGetSparkClusterByNameQueryKey,
  getGetSparkClusterListQueryKey,
} from "@workspace/api-client-react";
import type { SparkClusterProfile, SparkClusterFull } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
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
import {
  Play,
  Square,
  Minus,
  Plus,
  Settings2,
  ExternalLink,
  AlertTriangle,
  Save,
  RotateCcw,
  Cpu,
  MemoryStick,
  Server,
  CheckCircle2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const CLUSTER_DISPLAY_NAMES: Record<string, string> = {
  small: "Small Cluster",
  medium: "Medium Cluster",
  large: "Large Cluster",
};

const CLUSTER_DESCRIPTIONS: Record<string, string> = {
  small: "Suitable for development and lightweight testing",
  medium: "Suitable for normal ETL and data processing",
  large: "Suitable for heavy jobs and large batch processing",
};

type ConfigForm = {
  desiredWorkerReplicas: string;
  driverCpu: string;
  driverMemory: string;
  workerCpu: string;
  workerMemory: string;
  executorMemory: string;
  executorCores: string;
  shufflePartitions: string;
  dynamicAllocationEnabled: boolean;
};

function toConfigForm(c: SparkClusterProfile): ConfigForm {
  return {
    desiredWorkerReplicas: String(c.desiredWorkerReplicas),
    driverCpu: c.driverCpu,
    driverMemory: c.driverMemory,
    workerCpu: c.workerCpu,
    workerMemory: c.workerMemory,
    executorMemory: c.executorMemory ?? "",
    executorCores: String(c.executorCores ?? ""),
    shufflePartitions: String(c.shufflePartitions ?? ""),
    dynamicAllocationEnabled: c.dynamicAllocationEnabled ?? false,
  };
}

function parseCoreCount(val: string): number {
  const m = val.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

function parseMemoryGi(val: string): number {
  const m = val.match(/(\d+(?:\.\d+)?)/i);
  const n = m ? parseFloat(m[1]) : 0;
  if (val.toLowerCase().includes("ki")) return n / (1024 * 1024);
  if (val.toLowerCase().includes("mi")) return n / 1024;
  if (val.toLowerCase().includes("gi")) return n;
  if (val.toLowerCase().includes("ti")) return n * 1024;
  return n;
}

function formatStatus(s: string) {
  return s === "RUNNING" ? "Running" : s === "STOPPED" ? "Stopped" : s === "SCALING" ? "Scaling" : "Unknown";
}

export default function SparkCluster() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canStart = hasPermission("cluster.spark.start");
  const canStop = hasPermission("cluster.spark.stop");
  const canScale = hasPermission("cluster.spark.scale");
  const canConfig = hasPermission("cluster.spark.config.update") || hasPermission("*");

  const [selectedClusterName, setSelectedClusterName] = useState("data-exp-small");
  const [configForm, setConfigForm] = useState<ConfigForm | null>(null);
  const [configErrors, setConfigErrors] = useState<Record<string, string>>({});
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showScaleConfirm, setShowScaleConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [pendingScaleCount, setPendingScaleCount] = useState<number | null>(null);
  const [configChanged, setConfigChanged] = useState(false);

  const { data: listData, isLoading: listLoading } = useGetSparkClusterList();
  const { data: clusterFull, isLoading: clusterLoading } = useGetSparkClusterByName(
    selectedClusterName,
    {
      query: {
        queryKey: getGetSparkClusterByNameQueryKey(selectedClusterName),
      },
    }
  );

  const cluster = useMemo(() => {
    if (clusterFull?.cluster) return clusterFull.cluster;
    return null;
  }, [clusterFull?.cluster]);

  const pods = Array.isArray(clusterFull?.pods) ? clusterFull.pods : [];

  const startMutation = useStartSparkClusterByName();
  const stopMutation = useStopSparkClusterByName();
  const scaleMutation = useScaleSparkClusterByName();
  const configMutation = useUpdateSparkClusterConfig();

  // Initialize config form when cluster changes
  useEffect(() => {
    if (cluster) {
      setConfigForm(toConfigForm(cluster));
      setConfigErrors({});
      setConfigChanged(false);
    }
  }, [cluster?.clusterName]);

  const clusters = listData?.clusters ?? [];

  function invalidateCluster() {
    queryClient.invalidateQueries({ queryKey: getGetSparkClusterByNameQueryKey(selectedClusterName) });
    queryClient.invalidateQueries({ queryKey: getGetSparkClusterListQueryKey() });
  }

  function handleStart() {
    if (!cluster) return;
    startMutation.mutate(
      { clusterName: cluster.clusterName },
      {
        onSuccess: (res) => {
          toast({ title: res.message || `${CLUSTER_DISPLAY_NAMES[cluster.size]} started successfully` });
          invalidateCluster();
        },
        onError: () => {
          toast({ title: "Failed to start cluster", variant: "destructive" });
        },
      }
    );
  }

  function handleStopConfirmed() {
    setShowStopConfirm(false);
    if (!cluster) return;
    stopMutation.mutate(
      { clusterName: cluster.clusterName },
      {
        onSuccess: (res) => {
          toast({ title: res.message || `${CLUSTER_DISPLAY_NAMES[cluster.size]} stopped successfully` });
          invalidateCluster();
        },
        onError: () => {
          toast({ title: "Failed to stop cluster", variant: "destructive" });
        },
      }
    );
  }

  function handleScaleUp() {
    if (!cluster || !configForm) return;
    const current = parseInt(configForm.desiredWorkerReplicas, 10);
    if (current >= cluster.maxWorkers) {
      toast({
        title: `Cannot scale above ${cluster.maxWorkers} workers for ${CLUSTER_DISPLAY_NAMES[cluster.size]}`,
        variant: "destructive",
      });
      return;
    }
    const next = current + 1;
    setPendingScaleCount(next);
    setShowScaleConfirm(true);
  }

  function handleScaleDown() {
    if (!cluster || !configForm) return;
    const current = parseInt(configForm.desiredWorkerReplicas, 10);
    if (current <= cluster.minWorkers) {
      toast({
        title: `Cannot scale below ${cluster.minWorkers} workers for ${CLUSTER_DISPLAY_NAMES[cluster.size]}`,
        variant: "destructive",
      });
      return;
    }
    const next = current - 1;
    setPendingScaleCount(next);
    setShowScaleConfirm(true);
  }

  function handleApplyScaleConfirmed() {
    setShowScaleConfirm(false);
    if (!cluster || pendingScaleCount == null) return;
    const count = pendingScaleCount;
    scaleMutation.mutate(
      { clusterName: cluster.clusterName, data: { workers: count } },
      {
        onSuccess: (res) => {
          toast({ title: res.message || `${CLUSTER_DISPLAY_NAMES[cluster.size]} scaled to ${count} workers` });
          invalidateCluster();
        },
        onError: (err: Error) => {
          toast({ title: err.message || "Failed to scale cluster", variant: "destructive" });
        },
      }
    );
    setPendingScaleCount(null);
  }

  function validateConfig(c: ConfigForm, cluster: SparkClusterProfile): Record<string, string> {
    const errors: Record<string, string> = {};
    const workers = parseInt(c.desiredWorkerReplicas, 10);
    if (isNaN(workers) || workers < cluster.minWorkers || workers > cluster.maxWorkers) {
      errors.desiredWorkerReplicas = `Worker count must be between ${cluster.minWorkers} and ${cluster.maxWorkers}`;
    }
    if (!c.driverCpu.trim()) errors.driverCpu = "Driver CPU is required";
    if (!c.driverMemory.trim()) errors.driverMemory = "Driver memory is required";
    if (!c.workerCpu.trim()) errors.workerCpu = "Worker CPU is required";
    if (!c.workerMemory.trim()) errors.workerMemory = "Worker memory is required";
    return errors;
  }

  function handleSaveConfig() {
    if (!cluster || !configForm) return;
    const errors = validateConfig(configForm, cluster);
    setConfigErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast({ title: "Please fix validation errors before saving", variant: "destructive" });
      return;
    }
    if (configChanged) {
      setShowSaveConfirm(true);
    } else {
      doSaveConfig();
    }
  }

  function doSaveConfig() {
    setShowSaveConfirm(false);
    if (!cluster || !configForm) return;
    configMutation.mutate(
      {
        clusterName: cluster.clusterName,
        data: {
          driverCpu: configForm.driverCpu,
          driverMemory: configForm.driverMemory,
          workerCpu: configForm.workerCpu,
          workerMemory: configForm.workerMemory,
          executorMemory: configForm.executorMemory || undefined,
          executorCores: configForm.executorCores ? parseInt(configForm.executorCores, 10) : undefined,
          shufflePartitions: configForm.shufflePartitions ? parseInt(configForm.shufflePartitions, 10) : undefined,
          dynamicAllocationEnabled: configForm.dynamicAllocationEnabled,
          desiredWorkerReplicas: parseInt(configForm.desiredWorkerReplicas, 10),
        },
      },
      {
        onSuccess: (res) => {
          toast({ title: res.message || `${CLUSTER_DISPLAY_NAMES[cluster.size]} configuration saved successfully` });
          setConfigChanged(false);
          invalidateCluster();
        },
        onError: () => {
          toast({ title: "Failed to save configuration", variant: "destructive" });
        },
      }
    );
  }

  function handleResetConfig() {
    if (!cluster) return;
    setConfigForm(toConfigForm(cluster));
    setConfigErrors({});
    setConfigChanged(false);
    toast({ title: "Configuration reset to defaults" });
  }

  function updateField<K extends keyof ConfigForm>(field: K, value: ConfigForm[K]) {
    setConfigForm((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [field]: value };
      setConfigChanged(true);
      return next;
    });
    setConfigErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  const resourceSummary = useMemo(() => {
    if (!cluster || !configForm) return null;
    const workers = parseInt(configForm.desiredWorkerReplicas, 10) || 0;
    const driverCores = parseCoreCount(configForm.driverCpu);
    const workerCores = parseCoreCount(configForm.workerCpu);
    const driverMem = parseMemoryGi(configForm.driverMemory);
    const workerMem = parseMemoryGi(configForm.workerMemory);
    return {
      totalWorkerCpu: workerCores * workers,
      totalWorkerMemory: workerMem * workers,
      driverCpu: driverCores,
      driverMemory: driverMem,
      totalCpu: driverCores + workerCores * workers,
      totalMemory: driverMem + workerMem * workers,
    };
  }, [cluster, configForm]);

  const isRunning = cluster?.status === "RUNNING";

  return (
    <ProtectedRoute permission="cluster.spark.view">
      <Layout>
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Spark Cluster Management</h1>
          <p className="text-muted-foreground">Manage predefined Spark clusters and worker scaling</p>
        </div>

        {/* Cluster Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {listLoading ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : (
            clusters.map((c) => {
              const isSelected = c.clusterName === selectedClusterName;
              return (
                <button
                  key={c.clusterName}
                  data-testid={`cluster-card-${c.size}`}
                  onClick={() => setSelectedClusterName(c.clusterName)}
                  className={`text-left rounded-lg border p-4 transition-all hover:shadow-md ${
                    isSelected
                      ? "border-primary ring-1 ring-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{CLUSTER_DISPLAY_NAMES[c.size]}</span>
                    {isSelected && <CheckCircle2 size={16} className="text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{CLUSTER_DESCRIPTIONS[c.size]}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Default: {c.defaultWorkerReplicas} workers</span>
                    <span className="text-border">|</span>
                    <span>Range: {c.minWorkers}-{c.maxWorkers}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Cluster Detail + Config + Actions */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          {/* Cluster Overview */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server size={18} />
                Cluster Overview
              </CardTitle>
              <CardDescription>
                {cluster ? CLUSTER_DISPLAY_NAMES[cluster.size] : "Loading..."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clusterLoading || !cluster ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-6 w-1/2" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Cluster Name</Label>
                    <p className="text-sm font-medium font-mono">{cluster.clusterName}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Size</Label>
                    <p className="text-sm font-medium capitalize">{cluster.size}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Namespace</Label>
                    <p className="text-sm font-medium font-mono">{cluster.namespace}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div><StatusBadge status={formatStatus(cluster.status)} /></div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Workers</Label>
                    <p className="text-sm font-medium">
                      {cluster.currentWorkerReplicas} current / {cluster.desiredWorkerReplicas} desired
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Scale Limits</Label>
                    <p className="text-sm font-medium">
                      {cluster.minWorkers} min - {cluster.maxWorkers} max
                    </p>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Spark Master URL</Label>
                    <p className="text-sm font-medium font-mono truncate" title={cluster.sparkMasterUrl}>
                      {cluster.sparkMasterUrl}
                    </p>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Spark UI URL</Label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium font-mono truncate flex-1" title={cluster.sparkUiUrl}>
                        {cluster.sparkUiUrl}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs gap-1"
                        onClick={() => window.open(cluster.sparkUiUrl, "_blank")}
                      >
                        <ExternalLink size={12} />
                        Open
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resource Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu size={18} />
                Resource Summary
              </CardTitle>
              <CardDescription>Estimated total resources</CardDescription>
            </CardHeader>
            <CardContent>
              {!cluster || !resourceSummary ? (
                <div className="space-y-2">
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">Driver CPU</span>
                    <span className="text-sm font-medium">{resourceSummary.driverCpu} cores</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">Driver Memory</span>
                    <span className="text-sm font-medium">{resourceSummary.driverMemory.toFixed(1)} Gi</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">Total Worker CPU</span>
                    <span className="text-sm font-medium">{resourceSummary.totalWorkerCpu} cores</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">Total Worker Memory</span>
                    <span className="text-sm font-medium">{resourceSummary.totalWorkerMemory.toFixed(1)} Gi</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border bg-primary/5 rounded px-2 -mx-2">
                    <span className="text-sm font-medium">Estimated Total CPU</span>
                    <span className="text-sm font-bold">{resourceSummary.totalCpu} cores</span>
                  </div>
                  <div className="flex items-center justify-between py-2 bg-primary/5 rounded px-2 -mx-2">
                    <span className="text-sm font-medium">Estimated Total Memory</span>
                    <span className="text-sm font-bold">{resourceSummary.totalMemory.toFixed(1)} Gi</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions + Config */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          {/* Action Buttons */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 size={18} />
                Cluster Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      className="w-full gap-2 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                      onClick={handleStart}
                      disabled={!canStart || isRunning || startMutation.isPending || !cluster}
                      data-testid="button-start-cluster"
                    >
                      <Play size={16} />
                      Start
                    </Button>
                  </TooltipTrigger>
                  {!canStart && (
                    <TooltipContent>You do not have permission to perform this action.</TooltipContent>
                  )}
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="destructive"
                      className="w-full gap-2"
                      onClick={() => setShowStopConfirm(true)}
                      disabled={!canStop || !isRunning || stopMutation.isPending || !cluster}
                      data-testid="button-stop-cluster"
                    >
                      <Square size={16} />
                      Stop
                    </Button>
                  </TooltipTrigger>
                  {!canStop && (
                    <TooltipContent>You do not have permission to perform this action.</TooltipContent>
                  )}
                </Tooltip>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full gap-1"
                      onClick={handleScaleDown}
                      disabled={!canScale || !isRunning || scaleMutation.isPending || !cluster}
                      data-testid="button-scale-down"
                    >
                      <Minus size={14} />
                      Scale Down
                    </Button>
                  </TooltipTrigger>
                  {!canScale && (
                    <TooltipContent>You do not have permission to perform this action.</TooltipContent>
                  )}
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full gap-1"
                      onClick={handleScaleUp}
                      disabled={!canScale || !isRunning || scaleMutation.isPending || !cluster}
                      data-testid="button-scale-up"
                    >
                      <Plus size={14} />
                      Scale Up
                    </Button>
                  </TooltipTrigger>
                  {!canScale && (
                    <TooltipContent>You do not have permission to perform this action.</TooltipContent>
                  )}
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="default"
                      className="w-full gap-1"
                      onClick={() => {
                        if (!cluster || !configForm) return;
                        const count = parseInt(configForm.desiredWorkerReplicas, 10);
                        if (isNaN(count) || count < cluster.minWorkers || count > cluster.maxWorkers) {
                          toast({
                            title: `Worker count must be between ${cluster.minWorkers} and ${cluster.maxWorkers}`,
                            variant: "destructive",
                          });
                          return;
                        }
                        setPendingScaleCount(count);
                        setShowScaleConfirm(true);
                      }}
                      disabled={!canScale || scaleMutation.isPending || !cluster}
                      data-testid="button-apply-workers"
                    >
                      Apply
                    </Button>
                  </TooltipTrigger>
                  {!canScale && (
                    <TooltipContent>You do not have permission to perform this action.</TooltipContent>
                  )}
                </Tooltip>
              </div>
            </CardContent>
          </Card>

          {/* Editable Configuration */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 size={18} />
                Configuration
              </CardTitle>
              <CardDescription>Edit runtime configuration for the selected cluster</CardDescription>
            </CardHeader>
            <CardContent>
              {!cluster || !configForm ? (
                <div className="space-y-2">
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="desired-workers" className="text-xs">Desired Workers</Label>
                    <Input
                      id="desired-workers"
                      data-testid="input-desired-workers"
                      type="number"
                      min={cluster.minWorkers}
                      max={cluster.maxWorkers}
                      value={configForm.desiredWorkerReplicas}
                      onChange={(e) => updateField("desiredWorkerReplicas", e.target.value)}
                      disabled={!canConfig}
                      className={configErrors.desiredWorkerReplicas ? "border-destructive" : ""}
                    />
                    {configErrors.desiredWorkerReplicas && (
                      <p className="text-xs text-destructive">{configErrors.desiredWorkerReplicas}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="driver-cpu" className="text-xs">Driver CPU</Label>
                    <Input
                      id="driver-cpu"
                      data-testid="input-driver-cpu"
                      value={configForm.driverCpu}
                      onChange={(e) => updateField("driverCpu", e.target.value)}
                      disabled={!canConfig}
                      className={configErrors.driverCpu ? "border-destructive" : ""}
                    />
                    {configErrors.driverCpu && (
                      <p className="text-xs text-destructive">{configErrors.driverCpu}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="driver-memory" className="text-xs">Driver Memory</Label>
                    <Input
                      id="driver-memory"
                      data-testid="input-driver-memory"
                      value={configForm.driverMemory}
                      onChange={(e) => updateField("driverMemory", e.target.value)}
                      disabled={!canConfig}
                      className={configErrors.driverMemory ? "border-destructive" : ""}
                    />
                    {configErrors.driverMemory && (
                      <p className="text-xs text-destructive">{configErrors.driverMemory}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="worker-cpu" className="text-xs">Worker CPU</Label>
                    <Input
                      id="worker-cpu"
                      data-testid="input-worker-cpu"
                      value={configForm.workerCpu}
                      onChange={(e) => updateField("workerCpu", e.target.value)}
                      disabled={!canConfig}
                      className={configErrors.workerCpu ? "border-destructive" : ""}
                    />
                    {configErrors.workerCpu && (
                      <p className="text-xs text-destructive">{configErrors.workerCpu}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="worker-memory" className="text-xs">Worker Memory</Label>
                    <Input
                      id="worker-memory"
                      data-testid="input-worker-memory"
                      value={configForm.workerMemory}
                      onChange={(e) => updateField("workerMemory", e.target.value)}
                      disabled={!canConfig}
                      className={configErrors.workerMemory ? "border-destructive" : ""}
                    />
                    {configErrors.workerMemory && (
                      <p className="text-xs text-destructive">{configErrors.workerMemory}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="executor-memory" className="text-xs">Executor Memory</Label>
                    <Input
                      id="executor-memory"
                      data-testid="input-executor-memory"
                      value={configForm.executorMemory}
                      onChange={(e) => updateField("executorMemory", e.target.value)}
                      disabled={!canConfig}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="executor-cores" className="text-xs">Executor Cores</Label>
                    <Input
                      id="executor-cores"
                      data-testid="input-executor-cores"
                      type="number"
                      value={configForm.executorCores}
                      onChange={(e) => updateField("executorCores", e.target.value)}
                      disabled={!canConfig}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="shuffle-partitions" className="text-xs">Shuffle Partitions</Label>
                    <Input
                      id="shuffle-partitions"
                      data-testid="input-shuffle-partitions"
                      type="number"
                      value={configForm.shufflePartitions}
                      onChange={(e) => updateField("shufflePartitions", e.target.value)}
                      disabled={!canConfig}
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-6">
                    <Switch
                      id="dynamic-allocation"
                      data-testid="switch-dynamic-allocation"
                      checked={configForm.dynamicAllocationEnabled}
                      onCheckedChange={(v) => updateField("dynamicAllocationEnabled", v)}
                      disabled={!canConfig}
                    />
                    <Label htmlFor="dynamic-allocation" className="text-sm cursor-pointer">
                      Dynamic Allocation
                    </Label>
                  </div>
                </div>
              )}

              {cluster && configForm && (
                <div className="flex items-center gap-2 mt-6">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className="gap-2"
                        onClick={handleSaveConfig}
                        disabled={!canConfig || configMutation.isPending}
                        data-testid="button-save-config"
                      >
                        <Save size={16} />
                        Save Configuration
                      </Button>
                    </TooltipTrigger>
                    {!canConfig && (
                      <TooltipContent>You do not have permission to perform this action.</TooltipContent>
                    )}
                  </Tooltip>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={handleResetConfig}
                    disabled={!canConfig}
                    data-testid="button-reset-config"
                  >
                    <RotateCcw size={16} />
                    Reset to Default
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pods Table */}
        <Card>
          <CardHeader>
            <CardTitle>Cluster Pods</CardTitle>
            <CardDescription>Real-time status of all master and worker nodes</CardDescription>
          </CardHeader>
          <CardContent>
            {clusterLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pod Name</TableHead>
                      <TableHead>Cluster</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Node</TableHead>
                      <TableHead>CPU</TableHead>
                      <TableHead>Memory</TableHead>
                      <TableHead>Age</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pods.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <MemoryStick size={24} className="text-muted-foreground/50" />
                            <p>No running pods. Start the cluster to create master and worker pods.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      pods.map((pod) => (
                        <TableRow key={pod.podName}>
                          <TableCell className="font-medium font-mono text-xs">{pod.podName}</TableCell>
                          <TableCell className="text-xs">{cluster?.clusterName ?? "-"}</TableCell>
                          <TableCell className="capitalize text-xs">{pod.role}</TableCell>
                          <TableCell><StatusBadge status={pod.status} /></TableCell>
                          <TableCell className="text-xs">{pod.node}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{pod.cpu}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{pod.memory}</TableCell>
                          <TableCell className="text-xs">{pod.age}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stop Confirmation Modal */}
        <AlertDialog open={showStopConfirm} onOpenChange={setShowStopConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle size={20} />
                Stop {cluster ? CLUSTER_DISPLAY_NAMES[cluster.size] : "Cluster"}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will terminate all running pods and interrupt any active jobs.
                Are you sure you want to proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleStopConfirmed}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Stop Cluster
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Scale Confirmation Modal */}
        <AlertDialog open={showScaleConfirm} onOpenChange={setShowScaleConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Settings2 size={20} />
                Apply Worker Count?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will scale {cluster ? CLUSTER_DISPLAY_NAMES[cluster.size] : "the cluster"} to{" "}
                {pendingScaleCount} worker{pendingScaleCount === 1 ? "" : "s"}.
                Are you sure you want to proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleApplyScaleConfirmed}>Apply</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Save Config Confirmation Modal */}
        <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Save size={20} />
                Save Configuration?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Resource values have been changed. Are you sure you want to save these changes to{" "}
                {cluster ? CLUSTER_DISPLAY_NAMES[cluster.size] : "the cluster"}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={doSaveConfig}>Save</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Layout>
    </ProtectedRoute>
  );
}
