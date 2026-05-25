import { Skeleton } from "@/components/ui/skeleton";

interface StatusCount { status: string; count: number }

const STATUS_LABELS: Record<string, string> = {
  PENDING:    "Pending",
  CONFIRMED:  "Confirmed",
  PROCESSING: "Processing",
  SHIPPED:    "Dispatched",
  DELIVERED:  "Delivered",
  CANCELLED:  "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:    "bg-warning",
  CONFIRMED:  "bg-info",
  PROCESSING: "bg-accent",
  SHIPPED:    "bg-purple-500",
  DELIVERED:  "bg-success",
  CANCELLED:  "bg-muted-foreground",
};

const STATUS_TEXT: Record<string, string> = {
  PENDING:    "text-warning",
  CONFIRMED:  "text-info",
  PROCESSING: "text-accent-foreground",
  SHIPPED:    "text-purple-500",
  DELIVERED:  "text-success",
  CANCELLED:  "text-muted-foreground",
};

interface Props {
  ordersByStatus: StatusCount[];
  loading: boolean;
}

export function OrdersOverview({ ordersByStatus, loading }: Props) {
  const visible = ordersByStatus.filter((s) => s.status !== "DRAFT");
  const total = visible.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold">Orders by Status</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {loading ? "Loading…" : `${total} total orders across all statuses`}
        </p>
      </div>
      <div className="px-5 py-4">
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map(({ status, count }) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={status} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${STATUS_TEXT[status] ?? "text-foreground"}`}>
                      {STATUS_LABELS[status] ?? status}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${STATUS_COLORS[status] ?? "bg-muted-foreground"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
