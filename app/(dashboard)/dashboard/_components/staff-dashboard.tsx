"use client";

import Link from "next/link";
import { ShoppingCartIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StaffStatsRow } from "./staff-stats-row";
import { StaffRecentOrders, type RecentOrderItem } from "./staff-recent-orders";
import { ROUTES } from "@/constants/routes.constants";
import { useAuth } from "@/hooks/use-auth";
import type { OrderStatus } from "@/types/order.types";

// ── Placeholder data — replace when orders + dealers tables are ready ─────────
const PLACEHOLDER_STATS = {
  dealersUnderMe: 0,
  annualTarget: 1200000,
  achievedSoFar: 0,
  lastOrderDate: null,
  lastOrderDealer: null,
};

const PLACEHOLDER_ORDERS: RecentOrderItem[] = [
  { id: "1", dealer: "Patel Seeds Co.",     date: "22 May 2026", amount: 18400, status: "PENDING"   as OrderStatus },
  { id: "2", dealer: "Green Agro Hub",      date: "20 May 2026", amount: 9200,  status: "CONFIRMED" as OrderStatus },
  { id: "3", dealer: "Bharat Nursery",      date: "18 May 2026", amount: 31500, status: "SHIPPED"   as OrderStatus },
  { id: "4", dealer: "Kisan Beej Bhandar",  date: "15 May 2026", amount: 7600,  status: "DELIVERED" as OrderStatus },
  { id: "5", dealer: "Sardar Agri Store",   date: "12 May 2026", amount: 22100, status: "CANCELLED" as OrderStatus },
];
// ─────────────────────────────────────────────────────────────────────────────

export function StaffDashboard() {
  const { user } = useAuth();

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
      <StaffStatsRow stats={PLACEHOLDER_STATS} />

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
        <Link href={ROUTES.ORDERS.ROOT + "?tab=returns"}>
          <Button
            size="lg"
            variant="outline"
            className="w-full h-14 text-base gap-3 border-destructive text-destructive hover:bg-destructive/5 hover:text-destructive"
          >
            <RotateCcwIcon className="size-5" />
            Sales Return
          </Button>
        </Link>
      </div>

      {/* Recent orders */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold text-foreground">Recent Orders</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your last 5 orders
          </p>
        </div>
        <div className="px-4 sm:px-5">
          <StaffRecentOrders orders={PLACEHOLDER_ORDERS} />
        </div>
      </div>
    </div>
  );
}
