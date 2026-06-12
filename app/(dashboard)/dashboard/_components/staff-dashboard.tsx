"use client";

import Link from "next/link";
import { ShoppingCartIcon, RotateCcwIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { StaffStatsRow } from "./staff-stats-row";
import { StaffRecentOrders, type RecentOrderItem } from "./staff-recent-orders";
import { ROUTES } from "@/constants/routes.constants";
import { useAuth } from "@/hooks/use-auth";
import { formatDateMedium } from "@/lib/utils";
import type { OrderWithRelations } from "@/types/order.types";
import type { OrderStatusValue } from "@/constants/order-status.constants";

export function StaffDashboard() {
  const { user } = useAuth();

  const { data: dealersData } = useQuery({
    queryKey: ["staff-dealers-count", user?.id],
    queryFn: async () => {
      const res  = await fetch(`/api/dealers?staffId=${user!.id}&pageSize=1`);
      const json = await res.json();
      return json.data as { data: unknown[]; total: number };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  });

  const { data: ordersData, isFetching: ordersFetching } = useQuery({
    queryKey: ["staff-recent-orders", user?.id],
    queryFn: async () => {
      const res  = await fetch(`/api/orders?staffId=${user!.id}&pageSize=5`);
      const json = await res.json();
      if (!json.success) throw new Error("Failed to fetch orders");
      return json.data as { data: OrderWithRelations[]; total: number };
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const { data: pendingData } = useQuery({
    queryKey: ["staff-pending-orders", user?.id],
    queryFn: async () => {
      const res  = await fetch(`/api/orders?staffId=${user!.id}&status=PENDING&pageSize=1`);
      const json = await res.json();
      return json.data as { total: number };
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const orders = ordersData?.data ?? [];
  const lastOrder = orders[0] ?? null;

  const stats = {
    dealersUnderMe: dealersData?.total ?? 0,
    totalOrders:    ordersData?.total ?? 0,
    pendingOrders:  pendingData?.total ?? 0,
    lastOrderDate: lastOrder
      ? formatDateMedium(lastOrder.created_at)
      : null,
    lastOrderDealer: lastOrder?.dealer?.name ?? null,
  };

  const recentOrders: RecentOrderItem[] = orders.map((o) => ({
    id:        o.id,
    dealer:    o.dealer?.name ?? "—",
    date:      formatDateMedium(o.created_at),
    itemCount: o.items?.length ?? 0,
    status:    o.status as OrderStatusValue,
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Good day, {user?.name?.split(" ")[0] ?? "Staff"} 👋
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Here&apos;s your activity overview.
        </p>
      </div>

      {/* Stats row */}
      <StaffStatsRow stats={stats} />

      {/* CTA buttons */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link href={ROUTES.ORDERS.CREATE}>
          <Button
            size="lg"
            className="w-full h-14 text-base gap-3 bg-foreground text-background hover:bg-foreground/90"
          >
            <ShoppingCartIcon className="size-5" />
            Take New Order
          </Button>
        </Link>
        <div className="relative">
          <Button
            size="lg"
            variant="outline"
            disabled
            className="w-full h-14 text-base gap-3 border-destructive text-destructive opacity-50 cursor-not-allowed"
          >
            <RotateCcwIcon className="size-5" />
            Sales Return
          </Button>
          <span className="absolute -top-2 -right-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border">
            Coming Soon
          </span>
        </div>
      </div>

      {/* Recent orders */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold text-foreground">Recent Orders</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Your last 5 orders</p>
        </div>
        <div className="px-4 sm:px-5">
          <StaffRecentOrders orders={recentOrders} loading={ordersFetching && !ordersData} />
        </div>
      </div>
    </div>
  );
}
