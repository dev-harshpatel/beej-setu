"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDashboardStore } from "@/store/dashboard.store";
import { QUERY_KEYS } from "@/hooks/use-realtime-invalidation";
import { StatsRow } from "./stats-row";
import { PendingOrdersTable } from "./pending-orders-table";
import { ActivityFeed, type ActivityItem } from "./activity-feed";
import { OrderConfirmModal } from "@/app/(dashboard)/orders/_components/order-confirm-modal";
import { OrderDetailDrawer } from "@/app/(dashboard)/orders/_components/order-detail-drawer";
import type { OrderWithRelations } from "@/types/order.types";
import type { OrderRow } from "@/types/database.types";
import type { ActivityEvent } from "@/app/api/dashboard/activity/route";

type OrderStatus = OrderRow["status"];

interface DashboardStats {
  totalOrders: number;
  pendingApprovals: number;
  totalDealers: number;
  totalStaff: number;
  totalAdmins: number;
  salesReturns: number;
}

const EMPTY_STATS: DashboardStats = {
  totalOrders: 0, pendingApprovals: 0, totalDealers: 0,
  totalStaff: 0, totalAdmins: 0, salesReturns: 0,
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)   return "just now";
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  return `${days}d ago`;
}

export function DashboardClient() {
  const setPendingOrdersCount = useDashboardStore((s) => s.setPendingOrdersCount);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: QUERY_KEYS.DASHBOARD_STATS,
    queryFn: async () => {
      const res  = await fetch("/api/dashboard/stats");
      const json = await res.json();
      return (json.data ?? EMPTY_STATS) as DashboardStats;
    },
  });

  const { data: activityEvents = [] } = useQuery({
    queryKey: ["dashboard-activity"],
    queryFn: async () => {
      const res  = await fetch("/api/dashboard/activity");
      const json = await res.json();
      return (json.data ?? []) as ActivityEvent[];
    },
    refetchInterval: 30_000,
  });

  const activityItems: ActivityItem[] = activityEvents.map((e) => ({
    id:     e.id,
    type:   e.type,
    actor:  e.actor,
    action: e.action,
    target: e.target,
    time:   relativeTime(e.created_at),
  }));

  const [pendingOrders, setPendingOrders] = useState<OrderWithRelations[]>([]);
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0);
  const [, startTransition] = useTransition();

  const [confirmOrder, setConfirmOrder] = useState<OrderWithRelations | null>(null);
  const [confirmOpen, setConfirmOpen]   = useState(false);
  const [drawerOrder, setDrawerOrder]   = useState<OrderWithRelations | null>(null);
  const [drawerOpen, setDrawerOpen]     = useState(false);

  useEffect(() => {
    if (stats) setPendingOrdersCount(stats.pendingApprovals);
  }, [stats, setPendingOrdersCount, ordersRefreshKey]);

  const fetchPendingOrders = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/orders?status=PENDING&pageSize=10&page=1");
        const json = await res.json();
        if (json.success) setPendingOrders(json.data?.data ?? []);
      } catch { /* silent */ }
    });
  }, []);

  useEffect(() => { fetchPendingOrders(); }, [fetchPendingOrders, ordersRefreshKey]);

  function handleApprove(order: OrderWithRelations) {
    setConfirmOrder(order);
    setConfirmOpen(true);
  }

  function handleEdit(order: OrderWithRelations) {
    setDrawerOrder(order);
    setDrawerOpen(true);
  }

  function handleConfirmEdit(order: OrderWithRelations) {
    setConfirmOpen(false);
    setDrawerOrder(order);
    setDrawerOpen(true);
  }

  async function handleStatusChange(id: string, status: OrderStatus) {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message ?? "Status update failed");
    setOrdersRefreshKey((k) => k + 1);
  }

  async function handleUpdate(
    id: string,
    fields: Record<string, string | undefined>,
    itemEdits?: Record<string, { quantity: number; unit: string }>
  ) {
    const body: Record<string, unknown> = {};
    if (fields.notes !== undefined)  body.notes        = fields.notes;
    if (fields.delivery_date)        body.deliveryDate = fields.delivery_date;
    if (itemEdits && Object.keys(itemEdits).length > 0) {
      body.items = Object.entries(itemEdits).map(([itemId, { quantity, unit }]) => ({
        id: itemId, quantity, unit,
      }));
    }
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message ?? "Update failed");
  }

  const displayStats = stats ?? EMPTY_STATS;

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <StatsRow stats={displayStats} loading={statsLoading} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 flex-1 min-h-0 items-stretch">
        {/* Pending Orders — 3/5 */}
        <div className="lg:col-span-3 rounded-xl border border-border bg-card flex flex-col min-h-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5 shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Pending Orders</h3>
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
          <div className="flex-1 overflow-y-auto min-h-0">
            <PendingOrdersTable
              orders={pendingOrders}
              onApprove={handleApprove}
              onEdit={handleEdit}
              onRowClick={handleEdit}
            />
          </div>
        </div>

        {/* Activity Feed — 2/5 */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card flex flex-col min-h-0">
          <div className="border-b border-border px-4 py-3 sm:px-5 shrink-0">
            <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Latest actions across the platform
            </p>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 sm:px-5">
            <ActivityFeed items={activityItems} />
          </div>
        </div>
      </div>

      <OrderConfirmModal
        order={confirmOrder}
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onEdit={handleConfirmEdit}
        onConfirmed={() => {
          setConfirmOpen(false);
          setOrdersRefreshKey((k) => k + 1);
        }}
      />

      <OrderDetailDrawer
        order={drawerOrder}
        open={drawerOpen}
        initialMode="edit"
        onClose={() => setDrawerOpen(false)}
        onStatusChange={handleStatusChange}
        onUpdate={handleUpdate}
        onCreateChallan={() => {}}
        onRefresh={() => setOrdersRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
