"use client";

import { useEffect, useState } from "react";
import { useDashboardStore } from "@/store/dashboard.store";
import { StatsRow } from "./stats-row";
import { PendingOrdersTable, type PendingOrder } from "./pending-orders-table";
import { ActivityFeed, type ActivityItem } from "./activity-feed";

// ── Stats shape returned by /api/dashboard/stats ─────────────────────────────
interface DashboardStats {
  totalOrders: number;
  pendingApprovals: number;
  totalDealers: number;
  totalStaff: number;
  totalAdmins: number;
  salesReturns: number;
}

// ── Placeholder data — replace with real API calls when tables are ready ─────
// TODO: orders table  → pending orders list
// TODO: activity log  → real activity feed
const PLACEHOLDER_ORDERS: PendingOrder[] = [
  { id: "1", dealer: "Patel Seeds Co.", staff: "Ravi Kumar", date: "23 May 2026", items: 12 },
  { id: "2", dealer: "Green Agro Hub", staff: "Meena Shah", date: "22 May 2026", items: 5 },
  { id: "3", dealer: "Bharat Nursery", staff: "Amit Verma", date: "22 May 2026", items: 8 },
  { id: "4", dealer: "Kisan Beej Bhandar", staff: "Priya Nair", date: "21 May 2026", items: 3 },
  { id: "5", dealer: "Sardar Agri Store", staff: "Ravi Kumar", date: "20 May 2026", items: 15 },
  { id: "6", dealer: "Krishi Sansar", staff: "Deepak Joshi", date: "19 May 2026", items: 7 },
];

const PLACEHOLDER_ACTIVITY: ActivityItem[] = [
  { id: "1", actor: "Meena Shah", action: "approved order for", target: "Green Agro Hub", time: "2 minutes ago", type: "approval" },
  { id: "2", actor: "Ravi Kumar", action: "created order for", target: "Patel Seeds Co.", time: "18 minutes ago", type: "order" },
  { id: "3", actor: "Admin", action: "added new dealer", target: "Sunrise Seeds Ltd.", time: "1 hour ago", type: "dealer" },
  { id: "4", actor: "Priya Nair", action: "submitted return for", target: "Kisan Beej Bhandar", time: "2 hours ago", type: "return" },
  { id: "5", actor: "Amit Verma", action: "created order for", target: "Bharat Nursery", time: "3 hours ago", type: "order" },
  { id: "6", actor: "Admin", action: "added new staff", target: "Deepak Joshi", time: "Yesterday", type: "user" },
];

// ─────────────────────────────────────────────────────────────────────────────

export function DashboardClient() {
  const setPendingOrdersCount = useDashboardStore((s) => s.setPendingOrdersCount);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((json) => {
        const data = json.data as DashboardStats;
        setStats(data);
        setPendingOrdersCount(data.pendingApprovals);
      })
      .catch(() => {
        setStats({ totalOrders: 0, pendingApprovals: 0, totalDealers: 0, totalStaff: 0, totalAdmins: 0, salesReturns: 0 });
      })
      .finally(() => setStatsLoading(false));
  }, [setPendingOrdersCount]);

  const displayStats = stats ?? {
    totalOrders: 0,
    pendingApprovals: 0,
    totalDealers: 0,
    totalStaff: 0,
    totalAdmins: 0,
    salesReturns: 0,
  };

  return (
    <div className="flex flex-col gap-6">
      <StatsRow
        stats={displayStats}
        loading={statsLoading}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Pending Orders — 3/5 width on desktop */}
        <div className="lg:col-span-3 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Pending Orders
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {displayStats.pendingApprovals} orders awaiting approval
              </p>
            </div>
            {displayStats.pendingApprovals > 0 && (
              <span className="flex size-6 items-center justify-center rounded-full bg-warning/15 text-xs font-bold text-warning">
                {displayStats.pendingApprovals}
              </span>
            )}
          </div>
          <PendingOrdersTable orders={PLACEHOLDER_ORDERS} />
        </div>

        {/* Activity Feed — 2/5 width on desktop */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <h3 className="text-sm font-semibold text-foreground">
              Recent Activity
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Latest actions across the platform
            </p>
          </div>
          <div className="px-4 py-4 sm:px-5">
            <ActivityFeed items={PLACEHOLDER_ACTIVITY} />
          </div>
        </div>
      </div>
    </div>
  );
}
