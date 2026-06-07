"use client";

import { useState } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import Link from "next/link";
import { PlusIcon, ShoppingBagIcon, ChevronLeftIcon, ChevronRightIcon, EyeIcon, RefreshCwIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusBadge } from "./order-status-badge";
import { OrderDetailDrawer } from "./order-detail-drawer";
import { ROUTES } from "@/constants/routes.constants";
import { useAuth } from "@/hooks/use-auth";
import { QUERY_KEYS } from "@/hooks/use-realtime-invalidation";
import type { OrderWithRelations } from "@/types/order.types";
import {
  ORDER_STATUSES,
  type OrderStatusValue,
} from "@/constants/order-status.constants";
import { PAGINATION_DEFAULTS } from "@/constants/app.constants";

type TabValue = "all" | "pending" | "approved" | "dispatched";

const TAB_STATUS: Record<TabValue, OrderStatusValue | undefined> = {
  all:       undefined,
  pending:   ORDER_STATUSES.PENDING,
  approved:  ORDER_STATUSES.APPROVED,
  dispatched: ORDER_STATUSES.SHIPPED,
};

const PAGE_SIZE = PAGINATION_DEFAULTS.PAGE_SIZE;

export function StaffOrders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithRelations | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data, isFetching, refetch } = useQuery({
    queryKey: [
      ...QUERY_KEYS.ORDERS,
      { staffId: user?.id, page, pageSize: PAGE_SIZE, status: TAB_STATUS[activeTab] },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        staffId: user!.id,
      });
      const status = TAB_STATUS[activeTab];
      if (status) params.set("status", status);
      const res  = await fetch(`/api/orders?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error("Failed to fetch orders");
      return json.data as { data: OrderWithRelations[]; total: number };
    },
    enabled: !!user?.id,
    placeholderData: keepPreviousData,
  });

  const orders       = data?.data ?? [];
  const total        = data?.total ?? 0;
  const loading      = isFetching && !data;
  const isRefreshing = isFetching && !!data;

  function handleTabChange(value: string) { setActiveTab(value as TabValue); setPage(1); }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="h-full overflow-y-auto flex flex-col gap-4 pb-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">My Orders</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total > 0 ? `${total} order${total !== 1 ? "s" : ""}` : "Your placed orders"}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline" size="sm"
            onClick={() => refetch()}
            disabled={isRefreshing || loading}
            title="Refresh orders"
          >
            <RefreshCwIcon className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{isRefreshing ? "Refreshing…" : "Refresh"}</span>
          </Button>
          <Link
            href={ROUTES.ORDERS.CREATE}
            className={cn(buttonVariants({ size: "sm" }), "flex-1 sm:flex-none gap-1.5")}
          >
            <PlusIcon className="size-4" />
            New Order
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="dispatched">Dispatched</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table / Cards */}
      {loading ? (
        <>
          {/* Mobile skeleton */}
          <div className="md:hidden flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border border-l-4 border-l-muted bg-card p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <div className="pt-1.5 border-t border-border">
                  <Skeleton className="h-8 w-24 ml-auto" />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop skeleton */}
          <div className="hidden md:block rounded-lg border border-border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Dealer</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-7 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border py-16 text-muted-foreground">
          <ShoppingBagIcon className="size-8 opacity-40" />
          <p className="text-sm">No orders found</p>
          <Link
            href={ROUTES.ORDERS.CREATE}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }), "gap-1.5")}
          >
            <PlusIcon className="size-4" />
            Place your first order
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {orders.map((order) => {
              const itemCount = order.items?.length ?? 0;
              const date = new Date(order.created_at).toLocaleDateString("en-IN", {
                day: "2-digit", month: "short", year: "numeric",
              });
              return (
              <div
                key={order.id}
                className="rounded-lg border border-border border-l-4 border-l-muted bg-card p-3 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-foreground truncate">
                    {order.order_number}
                    <span className="font-sans font-normal text-muted-foreground"> · {date}</span>
                  </span>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-foreground leading-snug truncate">
                    {order.dealer?.name ?? "—"}
                  </p>
                  <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                    {itemCount} item{itemCount !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="pt-1.5 border-t border-border flex justify-end">
                  <Button
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => { setSelectedOrder(order); setDrawerOpen(true); }}
                  >
                    <EyeIcon className="size-3.5" />
                    View
                  </Button>
                </div>
              </div>
            );
            })}
          </div>

          {/* Desktop table — unchanged */}
          <div className="hidden md:block rounded-lg border border-border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Dealer</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs font-medium">
                      {order.order_number}
                    </TableCell>
                    <TableCell className="font-medium">
                      {order.dealer?.name ?? "—"}
                      <span className="block text-xs text-muted-foreground sm:hidden">
                        {new Date(order.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => { setSelectedOrder(order); setDrawerOpen(true); }}
                        >
                          <EyeIcon className="size-3.5" />
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Pagination */}
      {!loading && total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeftIcon className="size-3.5" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRightIcon className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Read-only order detail drawer */}
      <OrderDetailDrawer
        order={selectedOrder}
        open={drawerOpen}
        readOnly
        onClose={() => setDrawerOpen(false)}
        onStatusChange={async () => {}}
        onUpdate={async () => {}}
        onCreateChallan={() => {}}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDERS })}
      />
    </div>
  );
}
