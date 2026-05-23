import { Layout } from "@/components/layout";
import { ProtectedRoute } from "@/components/protected-route";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Layers, Box, GitMerge } from "lucide-react";

export default function About() {
  return (
    <ProtectedRoute permission="about.view">
      <Layout>
        <div className="max-w-3xl mx-auto space-y-6 pt-6">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Data Platform Portal</h1>
            <p className="text-muted-foreground text-lg">Internal Data Infrastructure Management</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Box size={20} className="text-primary" />
                Platform Components
              </CardTitle>
              <CardDescription>Built on modern open-source data technologies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border bg-muted/30">
                  <h3 className="font-medium mb-1">Compute</h3>
                  <p className="text-sm text-muted-foreground mb-2">Apache Spark on Kubernetes</p>
                  <ul className="text-xs text-muted-foreground list-disc list-inside ml-4 space-y-1">
                    <li>Dynamic allocation</li>
                    <li>Spark Thrift Server for BI</li>
                    <li>JupyterHub notebooks</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg border bg-muted/30">
                  <h3 className="font-medium mb-1">Storage & Streaming</h3>
                  <p className="text-sm text-muted-foreground mb-2">S3-compatible & Kafka</p>
                  <ul className="text-xs text-muted-foreground list-disc list-inside ml-4 space-y-1">
                    <li>MinIO object storage</li>
                    <li>Delta Lake table format</li>
                    <li>Apache Kafka events</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg border bg-muted/30">
                  <h3 className="font-medium mb-1">Orchestration</h3>
                  <p className="text-sm text-muted-foreground mb-2">Apache Airflow</p>
                  <ul className="text-xs text-muted-foreground list-disc list-inside ml-4 space-y-1">
                    <li>KubernetesPodOperator</li>
                    <li>Daily batch pipelines</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg border bg-muted/30">
                  <h3 className="font-medium mb-1">Governance</h3>
                  <p className="text-sm text-muted-foreground mb-2">OpenMetadata</p>
                  <ul className="text-xs text-muted-foreground list-disc list-inside ml-4 space-y-1">
                    <li>Data catalog</li>
                    <li>Lineage tracking</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers size={20} className="text-primary" />
                Environment Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div className="flex flex-col sm:flex-row sm:justify-between border-b pb-2">
                  <dt className="text-muted-foreground font-medium">Cluster</dt>
                  <dd className="font-mono">k8s-prod-us-west-2</dd>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between border-b pb-2">
                  <dt className="text-muted-foreground font-medium">Namespaces</dt>
                  <dd className="font-mono">compute, storage, orchestration</dd>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between border-b pb-2">
                  <dt className="text-muted-foreground font-medium">Network</dt>
                  <dd className="font-mono">Tailscale overlay (.tailnet)</dd>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between pt-1">
                  <dt className="text-muted-foreground font-medium">Portal Version</dt>
                  <dd className="font-mono">v1.2.0-stable</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield size={20} className="text-primary" />
                Access & Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Access to specific services is governed by your assigned role. If you need access to a service that is currently hidden or disabled, please request an escalation via the Data Platform Jira service desk.
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-sm text-primary hover:underline flex items-center gap-1">
                  <GitMerge size={14} /> Documentation
                </a>
                <a href="#" className="text-sm text-primary hover:underline flex items-center gap-1">
                  <GitMerge size={14} /> Create Ticket
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
