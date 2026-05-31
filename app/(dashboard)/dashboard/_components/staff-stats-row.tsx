import { UsersIcon, ShoppingCartIcon, ClockIcon, CalendarIcon } from "lucide-react";

interface StaffStats {
  dealersUnderMe: number;
  totalOrders: number;
  pendingOrders: number;
  lastOrderDate: string | null;
  lastOrderDealer: string | null;
}

interface StaffStatsRowProps {
  stats: StaffStats;
}

function StatCard({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground leading-tight">{label}</p>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="size-4" />
        </div>
      </div>
      {children}
    </div>
  );
}

export function StaffStatsRow({ stats }: StaffStatsRowProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Dealers Under Me" icon={UsersIcon}>
        <div>
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {stats.dealersUnderMe}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Assigned dealers</p>
        </div>
      </StatCard>

      <StatCard label="Total Orders" icon={ShoppingCartIcon}>
        <div>
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {stats.totalOrders}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">All time</p>
        </div>
      </StatCard>

      <StatCard label="Pending Orders" icon={ClockIcon}>
        <div>
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {stats.pendingOrders}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Awaiting approval</p>
        </div>
      </StatCard>

      <StatCard label="Last Order Placed" icon={CalendarIcon}>
        <div>
          {stats.lastOrderDate ? (
            <>
              <p className="text-base font-semibold text-foreground leading-tight">
                {stats.lastOrderDate}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {stats.lastOrderDealer}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No orders yet</p>
          )}
        </div>
      </StatCard>
    </div>
  );
}
