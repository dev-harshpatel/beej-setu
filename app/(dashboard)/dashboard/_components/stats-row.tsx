import {
  ShoppingCartIcon,
  ClockIcon,
  StoreIcon,
  UsersIcon,
  RotateCcwIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCard {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  accent?: boolean;
}

interface StatsRowProps {
  stats: {
    totalOrders: number;
    pendingApprovals: number;
    totalDealers: number;
    totalStaff: number;
    salesReturns: number;
  };
  loading?: boolean;
}

export function StatsRow({ stats, loading }: StatsRowProps) {
  const cards: StatCard[] = [
    {
      title: "Total Orders",
      value: stats.totalOrders,
      subtitle: "This month",
      icon: ShoppingCartIcon,
    },
    {
      title: "Pending Approvals",
      value: stats.pendingApprovals,
      subtitle: "Awaiting action",
      icon: ClockIcon,
      accent: true,
    },
    {
      title: "Total Dealers",
      value: stats.totalDealers,
      subtitle: "Active dealers",
      icon: StoreIcon,
    },
    {
      title: "Total Staff",
      value: stats.totalStaff,
      subtitle: "Active members",
      icon: UsersIcon,
    },
    {
      title: "Sales Returns",
      value: stats.salesReturns,
      subtitle: "This month",
      icon: RotateCcwIcon,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.title}
          className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground leading-tight">
              {card.title}
            </p>
            <div
              className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                card.accent
                  ? "bg-warning/10 text-warning"
                  : "bg-accent text-accent-foreground"
              }`}
            >
              <card.icon className="size-4" />
            </div>
          </div>
          <div>
            {loading ? (
              <>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-foreground tabular-nums">
                  {card.value}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {card.subtitle}
                </p>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
