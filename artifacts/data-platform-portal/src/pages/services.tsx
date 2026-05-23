import { useState } from "react";
import { useGetServices } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Database, Search, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MOCK_SERVICES } from "@/data/mock";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Services() {
  const { hasPermission } = useAuth();
  const { data, isLoading } = useGetServices();
  const [search, setSearch] = useState("");
  const [jdbcModalOpen, setJdbcModalOpen] = useState(false);
  const [selectedJdbcUrl, setSelectedJdbcUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const services = data || MOCK_SERVICES;

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

  return (
    <ProtectedRoute>
      <Layout>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Service Catalog</h1>
            <p className="text-muted-foreground">Access platform tools and endpoints</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search services..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
                    <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground bg-muted px-2 py-1 rounded">
                      {service.category}
                    </span>
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
      </Layout>
    </ProtectedRoute>
  );
}
