import { ArchiveIcon, CheckCircleIcon, PackageIcon, UsersIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SummaryCardsProps {
  totalOrders: number;
  confirmedOrders: number;
  totalInventoryPackets: number;
  lowStockCount: number;
  criticalStockCount: number;
  activeDealers: number;
  loading: boolean;
}

interface CardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent?: "default" | "warning" | "danger";
}

function Card({ label, value, sub, icon, accent = "default" }: CardProps) {
  const accentClass =
    accent === "danger"  ? "text-destructive" :
    accent === "warning" ? "text-warning" :
    "text-accent-foreground";

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-start gap-4">
      <div className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 ${accentClass}`}>
        {icon}
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`text-2xl font-bold tabular-nums ${accentClass}`}>{value}</span>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

export function ReportsSummaryCards({
  totalOrders, confirmedOrders, totalInventoryPackets,
  lowStockCount, criticalStockCount, activeDealers, loading,
}: SummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card px-5 py-4">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card
        label="Total Orders"
        value={totalOrders}
        sub="all active orders"
        icon={<PackageIcon className="size-4" />}
      />
      <Card
        label="Confirmed Orders"
        value={confirmedOrders}
        sub="awaiting dispatch"
        icon={<CheckCircleIcon className="size-4" />}
      />
      <Card
        label="Total Inventory"
        value={totalInventoryPackets.toLocaleString("en-IN")}
        sub="packet equivalents"
        icon={<ArchiveIcon className="size-4" />}
      />
      <Card
        label="Low Stock Items"
        value={lowStockCount}
        sub={criticalStockCount > 0 ? `${criticalStockCount} critical` : "all seeds healthy"}
        icon={<ArchiveIcon className="size-4" />}
        accent={criticalStockCount > 0 ? "danger" : lowStockCount > 0 ? "warning" : "default"}
      />
    </div>
  );
}
