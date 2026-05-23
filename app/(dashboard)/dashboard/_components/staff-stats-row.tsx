import { UsersIcon, TrendingUpIcon, IndianRupeeIcon, CalendarIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";

interface StaffStats {
  dealersUnderMe: number;
  annualTarget: number;
  achievedSoFar: number;
  lastOrderDate: string | null;
  lastOrderDealer: string | null;
}

interface StaffStatsRowProps {
  stats: StaffStats;
}

export function StaffStatsRow({ stats }: StaffStatsRowProps) {
  const achievedPercent =
    stats.annualTarget > 0
      ? Math.min(100, Math.round((stats.achievedSoFar / stats.annualTarget) * 100))
      : 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {/* Dealers Under Me */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Dealers Under Me</p>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <UsersIcon className="size-4" />
          </div>
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {stats.dealersUnderMe}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Assigned dealers</p>
        </div>
      </div>

      {/* Annual Target */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Annual Target</p>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <IndianRupeeIcon className="size-4" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {formatCurrency(stats.annualTarget)}
          </p>
          <div className="flex flex-col gap-1">
            <Progress value={achievedPercent} className="h-1.5" />
            <p className="text-xs text-muted-foreground">
              {achievedPercent}% achieved
            </p>
          </div>
        </div>
      </div>

      {/* Achieved So Far */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Achieved So Far</p>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <TrendingUpIcon className="size-4" />
          </div>
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {formatCurrency(stats.achievedSoFar)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            of {formatCurrency(stats.annualTarget)} target
          </p>
        </div>
      </div>

      {/* Last Order Placed */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Last Order Placed</p>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <CalendarIcon className="size-4" />
          </div>
        </div>
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
      </div>
    </div>
  );
}
