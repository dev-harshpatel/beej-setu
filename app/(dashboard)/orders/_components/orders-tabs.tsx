"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DownloadIcon, PlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button, buttonVariants } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/constants/roles.constants";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TablePagination } from "@/components/shared/table-pagination";
import { OrdersDesktopFiltersBar, OrdersMobileFilters } from "./orders-filters";
import { OrdersTable } from "./orders-table";
import { OrderBulkDeleteDialog } from "./order-bulk-delete-dialog";
import { OrderDetailDrawer } from "./order-detail-drawer";
import { OrderConfirmModal } from "./order-confirm-modal";
import { ORDER_STATUSES, type OrderStatusValue } from "@/constants/order-status.constants";
import type { PartialReason } from "./partial-approval-reason-modal";
import { ROLES } from "@/constants/roles.constants";
import { ROUTES } from "@/constants/routes.constants";
import { useAuthStore } from "@/store/auth.store";
import type { OrderWithRelations } from "@/types/order.types";
import { PAGINATION_DEFAULTS } from "@/constants/app.constants";
import {
  ADMIN_TABS, ADMIN_TAB_STATUS,
  DISPATCH_TABS, DISPATCH_TAB_STATUS, DISPATCH_VISIBLE_STATUSES,
  type TabValue,
} from "../_lib/orders.config";
import { useOrdersData } from "../_lib/use-orders-data";
import { exportOrdersToXlsx } from "../_lib/orders-export";
import { useOrdersFilterData } from "../_lib/use-orders-filter-data";

const PAGE_SIZE = PAGINATION_DEFAULTS.PAGE_SIZE;

export function OrdersTabs() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isDispatchStaff = user?.role === ROLES.DISPATCH_STAFF;
  const { hasPermission } = usePermissions();
  const canDelete = hasPermission(PERMISSIONS.ORDERS_DELETE);

  // ── Filter state ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [search, setSearch]       = useState("");
  const [dealerId, setDealerId]   = useState("");
  const [staffId, setStaffId]     = useState("");
  const [dateFrom, setDateFrom]   = useState("");
  const [dateTo, setDateTo]       = useState("");
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState<number>(PAGE_SIZE);

  // ── UI state ──────────────────────────────────────────────
  const [selectedOrder, setSelectedOrder]         = useState<OrderWithRelations | null>(null);
  const [drawerMode, setDrawerMode]               = useState<"view" | "edit">("view");
  const [drawerOpen, setDrawerOpen]               = useState(false);
  const [confirmOrder, setConfirmOrder]           = useState<OrderWithRelations | null>(null);
  const [confirmOpen, setConfirmOpen]             = useState(false);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [exporting, setExporting]                 = useState(false);
  const [selectedOrderIds, setSelectedOrderIds]   = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen]       = useState(false);

  const resolvedStatus: OrderStatusValue | undefined = isDispatchStaff
    ? DISPATCH_TAB_STATUS[activeTab as keyof typeof DISPATCH_TAB_STATUS]
    : ADMIN_TAB_STATUS[activeTab as keyof typeof ADMIN_TAB_STATUS];

  const resolvedStatuses: OrderStatusValue[] | undefined =
    isDispatchStaff && activeTab === "all" ? DISPATCH_VISIBLE_STATUSES : undefined;

  // Clear selection when tab or filters change
  useEffect(() => { setSelectedOrderIds(new Set()); }, [activeTab, dealerId, staffId, dateFrom, dateTo]);

  const { orders: rawOrders, total, loading, isRefreshing, invalidateOrders } = useOrdersData({
    page, pageSize, resolvedStatus, resolvedStatuses,
    dealerId, staffId, dateFrom, dateTo,
  });

  // Client-side search filter (instant, no API round-trip)
  const orders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rawOrders;
    return rawOrders.filter((o) =>
      o.order_number.toLowerCase().includes(q) ||
      o.dealer?.name.toLowerCase().includes(q),
    );
  }, [rawOrders, search]);

  const filterData = useOrdersFilterData();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const activeTabs = isDispatchStaff ? DISPATCH_TABS : ADMIN_TABS;

  // ── Handlers ──────────────────────────────────────────────
  function handleTabChange(v: string) { setActiveTab(v as TabValue); setPage(1); }

  function handleReset() {
    setSearch(""); setDealerId("");
    setStaffId(""); setDateFrom(""); setDateTo(""); setPage(1); setPageSize(PAGE_SIZE);
  }

  // ── Filter props (shared between mobile and desktop bars) ─
  const filterProps = {
    search,          onSearchChange: setSearch,
    dealerId,        onDealerChange: (v: string) => { setDealerId(v); setPage(1); },
    staffId,         onStaffChange:  (v: string) => { setStaffId(v);  setPage(1); },
    dateFrom,        onDateFromChange: (v: string) => { setDateFrom(v); setPage(1); },
    dateTo,          onDateToChange:   (v: string) => { setDateTo(v);   setPage(1); },
    onReset: handleReset,
    ...filterData,
  };

  function handleEdit(order: OrderWithRelations) {
    setSelectedOrder(order); setDrawerMode("edit"); setDrawerOpen(true);
  }

  async function handleStatusChange(id: string, status: OrderStatusValue, partialReason?: PartialReason) {
    const body: Record<string, unknown> = { status };
    if (partialReason) body.partial_reason = partialReason;
    const res  = await fetch(`/api/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message ?? "Status update failed");
    if (json.data) setSelectedOrder(json.data as OrderWithRelations);
    invalidateOrders();
  }

  function handleApprove(order: OrderWithRelations) {
    setConfirmOrder(order); setConfirmOpen(true);
  }

  async function handleHold(order: OrderWithRelations) {
    if (processingOrderId) return;
    setProcessingOrderId(order.id);
    try { await handleStatusChange(order.id, ORDER_STATUSES.HOLD); }
    finally { setProcessingOrderId(null); }
  }

  async function handleCancel(order: OrderWithRelations) {
    if (processingOrderId) return;
    setProcessingOrderId(order.id);
    try { await handleStatusChange(order.id, ORDER_STATUSES.CANCELLED); }
    finally { setProcessingOrderId(null); }
  }

  function handleCreateChallan(order: OrderWithRelations) {
    router.push(ROUTES.ORDERS.CHALLAN(order.id));
  }

  async function handleUpdate(
    id: string,
    fields: Record<string, string | undefined>,
    itemEdits?: Record<string, { quantity: number; unit: string }>,
  ) {
    const body: Record<string, unknown> = {};
    if (fields.notes !== undefined)  body.notes = fields.notes;
    if (fields.delivery_date)        body.deliveryDate = fields.delivery_date;
    if (itemEdits && Object.keys(itemEdits).length > 0) {
      body.items = Object.entries(itemEdits).map(([itemId, { quantity, unit }]) => ({
        id: itemId, quantity, unit,
      }));
    }
    const res  = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message ?? "Update failed");
    if (json.data) setSelectedOrder(json.data as OrderWithRelations);
    invalidateOrders();
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportOrdersToXlsx({ resolvedStatus, debouncedSearch: search, dealerId, staffId, dateFrom, dateTo });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Static top: header + tabs + mobile filters ─────── */}
      <div className="flex flex-col gap-3 pb-4 shrink-0">

        {/* Header row */}
        <div className="flex items-center gap-3">
          {/* Title — hidden on mobile to make room for tab dropdown + actions */}
          <div className="hidden sm:flex flex-col gap-0.5 shrink-0">
            <h2 className="text-xl font-semibold text-foreground">Orders</h2>
            <p className="text-sm text-muted-foreground">
              {total > 0 ? `${total} order${total !== 1 ? "s" : ""} found` : "Manage seed orders"}
            </p>
          </div>

          {/* Desktop: inline filter bar (grows to fill space) */}
          <OrdersDesktopFiltersBar {...filterProps} />

          {/* Right: mobile tab dropdown + Refresh + Export buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="sm:hidden">
              <Select value={activeTab} onValueChange={(v) => v && handleTabChange(v)}>
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue>{activeTabs.find((t) => t.value === activeTab)?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {activeTabs.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline" size="sm"
              onClick={invalidateOrders}
              disabled={isRefreshing || loading}
              className="shrink-0"
              title="Refresh orders"
            >
              <RefreshCwIcon className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{isRefreshing ? "Refreshing…" : "Refresh"}</span>
            </Button>
            {!isDispatchStaff && (
              <>
                <Link
                  href={ROUTES.ORDERS.CREATE}
                  className={cn(buttonVariants({ size: "sm" }), "gap-1.5 shrink-0")}
                >
                  <PlusIcon className="size-3.5" />
                  <span className="hidden sm:inline">New Order</span>
                </Link>
                <Button
                  variant="outline" size="sm"
                  onClick={handleExport}
                  disabled={exporting || total === 0}
                  className="hidden sm:flex shrink-0"
                >
                  <DownloadIcon className="size-3.5" />
                  {exporting ? "Exporting…" : "Export Excel"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Tabs — desktop only */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="hidden sm:flex">
            {activeTabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Mobile filters — search + collapsible extra filters */}
        <OrdersMobileFilters {...filterProps} />
      </div>

      {/* ── Bulk selection action bar ─────────────────────── */}
      {canDelete && selectedOrderIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 mb-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm shrink-0">
          <span className="font-medium text-destructive">
            {selectedOrderIds.size} order{selectedOrderIds.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost" size="sm" className="h-7 text-xs"
              onClick={() => setSelectedOrderIds(new Set())}
            >
              Clear
            </Button>
            <Button
              variant="destructive" size="sm" className="h-7 text-xs"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2Icon className="size-3.5" />
              Delete {selectedOrderIds.size}
            </Button>
          </div>
        </div>
      )}

      {/* ── Scrollable middle: orders list ────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden md:flex md:flex-col">
        <OrdersTable
          orders={orders}
          loading={loading}
          isDispatchStaff={isDispatchStaff}
          processingOrderId={processingOrderId}
          canDelete={canDelete}
          selectedIds={selectedOrderIds}
          onSelectionChange={setSelectedOrderIds}
          onEdit={handleEdit}
          onApprove={handleApprove}
          onHold={handleHold}
          onCancel={handleCancel}
          onCreateChallan={handleCreateChallan}
          onReset={handleReset}
        />
      </div>

      {/* ── Sticky bottom: pagination bar ─────────────────── */}
      {!loading && total > 0 && (
        <div className="shrink-0 border-t border-border bg-background py-3">
          <TablePagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        </div>
      )}

      {/* Order detail drawer */}
      <OrderDetailDrawer
        order={selectedOrder}
        open={drawerOpen}
        initialMode={drawerMode}
        onClose={() => setDrawerOpen(false)}
        onStatusChange={handleStatusChange}
        onUpdate={handleUpdate}
        onApprove={(order) => { setDrawerOpen(false); setConfirmOrder(order); setConfirmOpen(true); }}
        onCreateChallan={(order) => { setDrawerOpen(false); handleCreateChallan(order); }}
        onRefresh={invalidateOrders}
      />

      {/* Bulk delete modal */}
      <OrderBulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        count={selectedOrderIds.size}
        ids={[...selectedOrderIds]}
        onSuccess={() => { invalidateOrders(); setSelectedOrderIds(new Set()); setBulkDeleteOpen(false); }}
      />

      {/* Batch approval modal */}
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
        onConfirmed={() => { setConfirmOpen(false); invalidateOrders(); }}
      />


    </div>
  );
}
