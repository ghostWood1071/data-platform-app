import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";

export function StatusBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase() || "unknown";
  
  if (normalized === "running" || normalized === "active") {
    return (
      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 gap-1.5 font-medium px-2 py-0.5">
        <CheckCircle2 size={12} />
        {status}
      </Badge>
    );
  }
  
  if (normalized === "stopped" || normalized === "disabled" || normalized === "failed") {
    return (
      <Badge variant="outline" className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20 gap-1.5 font-medium px-2 py-0.5">
        <XCircle size={12} />
        {status}
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="bg-muted text-muted-foreground hover:bg-muted/80 gap-1.5 font-medium px-2 py-0.5">
      <HelpCircle size={12} />
      {status || "Unknown"}
    </Badge>
  );
}
