import type { DealerStatus } from "@/types/dealer.types";

const CONFIG: Record<DealerStatus, { label: string; className: string }> = {
  ACTIVE:    { label: "Active",    className: "bg-accent text-accent-foreground" },
  INACTIVE:  { label: "Inactive",  className: "bg-muted text-muted-foreground" },
  SUSPENDED: { label: "Suspended", className: "bg-destructive/10 text-destructive" },
};

export function DealerStatusBadge({ status }: { status: DealerStatus }) {
  const { label, className } = CONFIG[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
