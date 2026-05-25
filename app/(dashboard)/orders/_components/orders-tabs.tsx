"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { OrdersFilters } from "./orders-filters";
import { OrdersTable } from "./orders-table";
import { OrderDetailDrawer } from "./order-detail-drawer";
import { OrderConfirmModal } from "./order-confirm-modal";
import { CreateChallanDialog } from "./create-challan-dialog";
import {
  ORDER_STATUSES,
  type OrderStatusValue,
} from "@/constants/order-status.constants";
import { ROLES } from "@/constants/roles.constants";
import { useAuthStore } from "@/store/auth.store";
import { QUERY_KEYS } from "@/hooks/use-realtime-invalidation";
import type { OrderWithRelations } from "@/types/order.types";
import { PAGINATION_DEFAULTS } from "@/constants/app.constants";
import * as XLSX from "xlsx";

// ── Admin tab config ──────────────────────────────────────────
type AdminTabValue = "all" | "pending" | "approved" | "partially_approved" | "hold" | "dispatched";

const ADMIN_TAB_STATUS: Record<AdminTabValue, OrderStatusValue | undefined> = {
  all:                undefined,
  pending:            ORDER_STATUSES.PENDING,
  approved:           ORDER_STATUSES.APPROVED,
  partially_approved: ORDER_STATUSES.PARTIALLY_APPROVED,
  hold:               ORDER_STATUSES.HOLD,
  dispatched:         ORDER_STATUSES.SHIPPED,
};

// ── Dispatch Staff tab config ─────────────────────────────────
type DispatchTabValue = "all" | "ready" | "godown" | "transport" | "delivered";

const DISPATCH_TAB_STATUS: Record<DispatchTabValue, OrderStatusValue | undefined> = {
  all:       undefined,
  ready:     ORDER_STATUSES.APPROVED,
  godown:    ORDER_STATUSES.GODOWN_DISPATCHED,
  transport: ORDER_STATUSES.TRANSPORT_DISPATCHED,
  delivered: ORDER_STATUSES.SHIPPED,
};

type TabValue = AdminTabValue | DispatchTabValue;

const PAGE_SIZE = PAGINATION_DEFAULTS.PAGE_SIZE;

export function OrdersTabs() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isDispatchStaff = user?.role === ROLES.DISPATCH_STAFF;

  // ── Filter state ──────────────────────────────────────────
  const [activeTab, setActiveTab]               = useState<TabValue>("all");
  const [search, setSearch]                     = useState("");
  const [debouncedSearch, setDebouncedSearch]   = useState("");
  const [dealerId, setDealerId]                 = useState("");
  const [staffId, setStaffId]                   = useState("");
  const [dateFrom, setDateFrom]                 = useState("");
  const [dateTo, setDateTo]                     = useState("");
  const [page, setPage]                         = useState(1);

  // ── UI state ──────────────────────────────────────────────
  const [selectedOrder, setSelectedOrder] = useState<OrderWithRelations | null>(null);
  const [drawerMode, setDrawerMode]       = useState<"view" | "edit">("view");
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [challanOrder, setChallanOrder]   = useState<OrderWithRelations | null>(null);
  const [challanOpen, setChallanOpen]     = useState(false);

  const [confirmOrder, setConfirmOrder] = useState<OrderWithRelations | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const resolvedStatus: OrderStatusValue | undefined = isDispatchStaff
    ? DISPATCH_TAB_STATUS[activeTab as DispatchTabValue]
    : ADMIN_TAB_STATUS[activeTab as AdminTabValue];

  // ── Data fetching ─────────────────────────────────────────
  // Realtime invalidation (RealtimeInvalidationBridge) automatically refetches
  // this query whenever the orders table changes in Supabase.
  const { data, isFetching } = useQuery({
    queryKey: [
      ...QUERY_KEYS.ORDERS,
      { page, pageSize: PAGE_SIZE, status: resolvedStatus, search: debouncedSearch, dealerId, staffId, dateFrom, dateTo },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (resolvedStatus)  params.set("status", resolvedStatus);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (dealerId)        params.set("dealerId", dealerId);
      if (staffId)         params.set("staffId", staffId);
      if (dateFrom)        params.set("dateFrom", dateFrom);
      if (dateTo)          params.set("dateTo", dateTo);
      const res  = await fetch(`/api/orders?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error("Failed to fetch orders");
      return json.data as { data: OrderWithRelations[]; total: number };
    },
    placeholderData: keepPreviousData,
  });

  const orders  = data?.data ?? [];
  const total   = data?.total ?? 0;
  // Show skeleton only on the very first load — keepPreviousData handles tab/filter transitions
  const loading = isFetching && !data;

  // ── Helpers ───────────────────────────────────────────────
  function invalidateOrders() {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDERS });
  }

  function handleTabChange(v: string) { setActiveTab(v as TabValue); setPage(1); }

  function handleReset() {
    setSearch(""); setDebouncedSearch(""); setDealerId("");
    setStaffId(""); setDateFrom(""); setDateTo(""); setPage(1);
  }

  function handleEdit(order: OrderWithRelations) {
    setSelectedOrder(order); setDrawerMode("edit"); setDrawerOpen(true);
  }

  async function handleStatusChange(id: string, status: OrderStatusValue) {
    const res  = await fetch(`/api/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message ?? "Status update failed");
    invalidateOrders();
  }

  async function handleApprove(order: OrderWithRelations) {
    await handleStatusChange(order.id, ORDER_STATUSES.APPROVED);
  }
  async function handleHold(order: OrderWithRelations) {
    await handleStatusChange(order.id, ORDER_STATUSES.HOLD);
  }
  async function handleCancel(order: OrderWithRelations) {
    await handleStatusChange(order.id, ORDER_STATUSES.CANCELLED);
  }

  function handleCreateChallan(order: OrderWithRelations) {
    setChallanOrder(order); setChallanOpen(true);
  }

  async function handleUpdate(
    id: string,
    fields: Record<string, string | undefined>,
    itemEdits?: Record<string, { quantity: number; unit: string }>,
  ) {
    const body: Record<string, unknown> = {};
    if (fields.notes !== undefined) body.notes = fields.notes;
    if (fields.delivery_date)       body.deliveryDate = fields.delivery_date;
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
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.message ?? "Update failed");
    }
    invalidateOrders();
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams({ page: "1", pageSize: "10000" });
      if (resolvedStatus)  params.set("status", resolvedStatus);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (dealerId)        params.set("dealerId", dealerId);
      if (staffId)         params.set("staffId", staffId);
      if (dateFrom)        params.set("dateFrom", dateFrom);
      if (dateTo)          params.set("dateTo", dateTo);
      const res  = await fetch(`/api/orders?${params}`);
      const json = await res.json();
      if (!json.success) return;

      const allOrders = json.data.data as OrderWithRelations[];
      const rows = allOrders.flatMap((order) =>
        (order.items ?? []).map((item) => ({
          "Order Number":  order.order_number,
          "Dealer":        order.dealer?.name ?? "",
          "Territory":     order.dealer?.territory ?? "",
          "Staff":         order.staff?.name ?? "",
          "Center":        order.center ?? "",
          "Transport":     order.transport_name ?? "",
          "Status":        order.status,
          "Date":          new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
          "Crop":          item.seed?.crops?.name ?? "",
          "Variety":       item.seed?.variety ?? "",
          "Pack Size":     item.seed?.pack_size ?? "",
          "Unit":          item.unit,
          "Quantity":      item.quantity,        // number → numeric cell
          "Notes":         order.notes ?? "",
        }))
      );

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Orders");
      XLSX.writeFile(wb, `orders-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-foreground">Orders</h2>
          <p className="text-sm text-muted-foreground">
            {total > 0 ? `${total} order${total !== 1 ? "s" : ""} found` : "Manage seed orders"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || total === 0}>
          <DownloadIcon className="size-3.5" />
          {exporting ? "Exporting…" : "Export Excel"}
        </Button>
      </div>

      {/* Tabs — role-specific */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        {isDispatchStaff ? (
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="all">All Orders</TabsTrigger>
            <TabsTrigger value="ready">Pending</TabsTrigger>
            <TabsTrigger value="godown">Godown Dispatch</TabsTrigger>
            <TabsTrigger value="transport">Transport Dispatch</TabsTrigger>
            <TabsTrigger value="delivered">Confirmed Order</TabsTrigger>
          </TabsList>
        ) : (
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="all">All Orders</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="partially_approved">Partial</TabsTrigger>
            <TabsTrigger value="hold">Hold</TabsTrigger>
            <TabsTrigger value="dispatched">Dispatched</TabsTrigger>
          </TabsList>
        )}
      </Tabs>

      {/* Filters */}
      <OrdersFilters
        search={search}
        onSearchChange={setSearch}
        dealerId={dealerId}
        onDealerChange={(v) => { setDealerId(v); setPage(1); }}
        staffId={staffId}
        onStaffChange={(v) => { setStaffId(v); setPage(1); }}
        dateFrom={dateFrom}
        onDateFromChange={(v) => { setDateFrom(v); setPage(1); }}
        dateTo={dateTo}
        onDateToChange={(v) => { setDateTo(v); setPage(1); }}
        onReset={handleReset}
      />

      {/* Table */}
      <OrdersTable
        orders={orders}
        loading={loading}
        onEdit={handleEdit}
        onApprove={handleApprove}
        onHold={handleHold}
        onCancel={handleCancel}
        onCreateChallan={handleCreateChallan}
      />

      {/* Pagination */}
      {!loading && total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {page} of {totalPages}</span>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeftIcon className="size-3.5" />Prev
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next<ChevronRightIcon className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Drawers */}
      <OrderDetailDrawer
        order={selectedOrder}
        open={drawerOpen}
        initialMode={drawerMode}
        onClose={() => setDrawerOpen(false)}
        onStatusChange={handleStatusChange}
        onUpdate={handleUpdate}
        onCreateChallan={(order) => {
          setDrawerOpen(false);
          handleCreateChallan(order);
        }}
        onRefresh={invalidateOrders}
      />

      {/* Confirm modal */}
      <OrderConfirmModal
        order={confirmOrder}
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onEdit={(order) => {
          setConfirmOpen(false);
          setSelectedOrder(order);
          setDrawerMode("edit");
          setDrawerOpen(true);
        }}
        onConfirmed={() => {
          setConfirmOpen(false);
          invalidateOrders();
        }}
      />

      <CreateChallanDialog
        order={challanOrder}
        open={challanOpen}
        onClose={() => setChallanOpen(false)}
        onDispatched={() => { invalidateOrders(); setChallanOrder(null); }}
      />
    </div>
  );
}
