import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  createService,
  deleteService,
  getGetServicesQueryKey,
  updateService,
  useGetServices,
  type PlatformService,
  type PlatformServiceInput,
  type PlatformServiceUpdate,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Database, Search, Copy, Check, Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const emptyServiceForm: PlatformServiceInput = {
  id: "",
  name: "",
  description: "",
  namespace: "",
  status: "Running",
  url: "",
  category: "",
  isJdbc: false,
};

export default function Services() {
  const { hasPermission } = useAuth();
  const { data, isLoading } = useGetServices();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [jdbcModalOpen, setJdbcModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedJdbcUrl, setSelectedJdbcUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PlatformServiceInput>(emptyServiceForm);
  const canCreateService = hasPermission("service.create");
  const canUpdateService = hasPermission("service.update");
  const canDeleteService = hasPermission("service.delete");

  const services = data || [];

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.description.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  ).filter(s => {
    // Basic auth check for UI display
    if (s.id === "spark-ui" || s.id === "spark-thrift") return hasPermission("cluster.spark.view");
    return hasPermission(`service.${s.id}.open`) || hasPermission("*");
  });

  const handleOpenService = (service: typeof services[0]) => {
    if (service.isJdbc) {
      setSelectedJdbcUrl(service.url);
      setJdbcModalOpen(true);
    } else {
      window.open(service.url, '_blank');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(selectedJdbcUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openCreateModal = () => {
    setEditingServiceId(null);
    setFormData(emptyServiceForm);
    setCreateModalOpen(true);
  };

  const openEditModal = (service: PlatformService) => {
    setEditingServiceId(service.id);
    setFormData({
      id: service.id,
      name: service.name,
      description: service.description,
      namespace: service.namespace,
      status: service.status,
      url: service.url,
      category: service.category,
      isJdbc: service.isJdbc ?? false,
    });
    setCreateModalOpen(true);
  };

  const handleSaveService = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);

    const payload: PlatformServiceInput = {
      ...formData,
      id: formData.id.trim(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      namespace: formData.namespace.trim(),
      url: formData.url.trim(),
      category: formData.category.trim(),
      isJdbc: formData.isJdbc ?? false,
    };

    try {
      if (editingServiceId) {
        const updatePayload: PlatformServiceUpdate = {
          name: payload.name,
          description: payload.description,
          namespace: payload.namespace,
          status: payload.status,
          url: payload.url,
          category: payload.category,
          isJdbc: payload.isJdbc,
        };
        await updateService(editingServiceId, updatePayload);
      } else {
        await createService(payload);
      }

      await queryClient.invalidateQueries({ queryKey: getGetServicesQueryKey() });
      setCreateModalOpen(false);
      toast({ title: `Service ${editingServiceId ? "updated" : "created"} successfully` });
    } catch {
      toast({ title: `Failed to ${editingServiceId ? "update" : "create"} service`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteService = async (service: PlatformService) => {
    if (!window.confirm(`Delete service "${service.name}" permanently?`)) return;

    try {
      await deleteService(service.id);
      await queryClient.invalidateQueries({ queryKey: getGetServicesQueryKey() });
      toast({ title: "Service deleted successfully" });
    } catch {
      toast({ title: "Failed to delete service", variant: "destructive" });
    }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Service Catalog</h1>
            <p className="text-muted-foreground">Access platform tools and endpoints</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {canCreateService && (
              <Button className="gap-2" onClick={openCreateModal}>
                <Plus size={16} />
                Add Service
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <Card key={i} className="flex flex-col h-[200px]">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="flex-1">
                  <Skeleton className="h-5 w-20" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-9 w-full" />
                </CardFooter>
              </Card>
            ))
          ) : filteredServices.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              <Database className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No services found</h3>
              <p>Try adjusting your search query or check your permissions.</p>
            </div>
          ) : (
            filteredServices.map(service => (
              <Card key={service.id} className="flex flex-col border-border/50 shadow-sm hover:shadow-md transition-all">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-1">
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground bg-muted px-2 py-1 rounded">
                        {service.category}
                      </span>
                      {(canUpdateService || canDeleteService) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="gap-2"
                              disabled={!canUpdateService}
                              onClick={() => openEditModal(service)}
                            >
                              <Edit size={14} />
                              Edit service
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2 text-destructive focus:bg-destructive/10"
                              disabled={!canDeleteService}
                              onClick={() => handleDeleteService(service)}
                            >
                              <Trash2 size={14} />
                              Delete service
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2 min-h-[40px]">{service.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 pb-4">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={service.status} />
                    <span className="text-xs text-muted-foreground font-mono truncate max-w-[150px]" title={service.url}>
                      {service.url}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button 
                    className="w-full gap-2" 
                    variant={service.isJdbc ? "secondary" : "default"}
                    onClick={() => handleOpenService(service)}
                  >
                    {service.isJdbc ? <Database size={16} /> : <ExternalLink size={16} />}
                    {service.isJdbc ? "View Connection Details" : "Open Service"}
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>

        <Dialog open={jdbcModalOpen} onOpenChange={setJdbcModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>JDBC Connection Details</DialogTitle>
              <DialogDescription>
                Use this URL to connect your SQL client (DBeaver, DataGrip, etc.) to the platform.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">JDBC URL</label>
                <div className="flex gap-2">
                  <Input readOnly value={selectedJdbcUrl} className="font-mono text-xs bg-muted" />
                  <Button variant="outline" size="icon" onClick={copyToClipboard} className="shrink-0">
                    {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </Button>
                </div>
              </div>
              <div className="text-sm bg-blue-500/10 text-blue-700 p-3 rounded border border-blue-500/20">
                <strong>Note:</strong> You will need to use your platform credentials (username/password) when connecting.
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent className="sm:max-w-[560px]">
            <form onSubmit={handleSaveService}>
              <DialogHeader>
                <DialogTitle>{editingServiceId ? "Edit Service" : "Add Service"}</DialogTitle>
                <DialogDescription>
                  {editingServiceId
                    ? "Update the catalog entry for this platform endpoint."
                    : "Create a catalog entry for a platform endpoint."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="service-id">Service ID</Label>
                  <Input
                    id="service-id"
                    value={formData.id}
                    onChange={(event) => setFormData({ ...formData, id: event.target.value })}
                    placeholder="superset"
                    disabled={Boolean(editingServiceId)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-name">Name</Label>
                  <Input
                    id="service-name"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    placeholder="Apache Superset"
                    required
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="service-description">Description</Label>
                  <Input
                    id="service-description"
                    value={formData.description}
                    onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                    placeholder="BI dashboard and exploration"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-namespace">Namespace</Label>
                  <Input
                    id="service-namespace"
                    value={formData.namespace}
                    onChange={(event) => setFormData({ ...formData, namespace: event.target.value })}
                    placeholder="analytics"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-category">Category</Label>
                  <Input
                    id="service-category"
                    value={formData.category}
                    onChange={(event) => setFormData({ ...formData, category: event.target.value })}
                    placeholder="analytics"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        status: value as PlatformServiceInput["status"],
                      })
                    }
                  >
                    <SelectTrigger id="service-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Running">Running</SelectItem>
                      <SelectItem value="Stopped">Stopped</SelectItem>
                      <SelectItem value="Unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end pb-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="service-is-jdbc"
                      checked={formData.isJdbc}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isJdbc: checked === true })
                      }
                    />
                    <Label htmlFor="service-is-jdbc">JDBC endpoint</Label>
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="service-url">URL</Label>
                  <Input
                    id="service-url"
                    value={formData.url}
                    onChange={(event) => setFormData({ ...formData, url: event.target.value })}
                    placeholder="https://superset.k8s.tailnet"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving
                    ? "Saving..."
                    : editingServiceId
                      ? "Save Changes"
                      : "Create Service"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Layout>
    </ProtectedRoute>
  );
}
