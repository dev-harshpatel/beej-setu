"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { OrdersFilters } from "./orders-filters";
import { OrdersTable } from "./orders-table";
import { OrderDetailDrawer } from "./order-detail-drawer";
import { OrderConfirmModal } from "./order-confirm-modal";
import { CreateChallanDialog } from "./create-challan-dialog";
import type { OrderWithRelations } from "@/types/order.types";
import type { OrderRow } from "@/types/database.types";
import { PAGINATION_DEFAULTS } from "@/constants/app.constants";

type TabValue = "all" | "pending" | "confirmed" | "dispatched";
type OrderStatus = OrderRow["status"];

const TAB_STATUS: Record<TabValue, OrderStatus | undefined> = {
  all: undefined,
  pending: "PENDING",
  confirmed: "CONFIRMED",
  dispatched: "SHIPPED",
};

const PAGE_SIZE = PAGINATION_DEFAULTS.PAGE_SIZE;

export function OrdersTabs() {
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dealerId, setDealerId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedOrder, setSelectedOrder] = useState<OrderWithRelations | null>(null);
  const [drawerMode, setDrawerMode] = useState<"view" | "edit">("view");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [challanOrder, setChallanOrder] = useState<OrderWithRelations | null>(null);
  const [challanOpen, setChallanOpen] = useState(false);

  const [confirmOrder, setConfirmOrder] = useState<OrderWithRelations | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      const status = TAB_STATUS[activeTab];
      if (status) params.set("status", status);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (dealerId) params.set("dealerId", dealerId);
      if (staffId) params.set("staffId", staffId);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/orders?${params}`);
      const json = await res.json();
      if (json.success) {
        setOrders(json.data?.data ?? []);
        setTotal(json.data?.total ?? 0);
      }
    } catch {
      setOrders([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [activeTab, debouncedSearch, dealerId, staffId, dateFrom, dateTo, page, refreshKey]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  function handleTabChange(value: string) {
    setActiveTab(value as TabValue);
    setPage(1);
  }

  function handleReset() {
    setSearch("");
    setDebouncedSearch("");
    setDealerId("");
    setStaffId("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  function handleEdit(order: OrderWithRelations) {
    setSelectedOrder(order);
    setDrawerMode("edit");
    setDrawerOpen(true);
  }

  function handleConfirm(order: OrderWithRelations) {
    setConfirmOrder(order);
    setConfirmOpen(true);
  }

  function handleConfirmEdit(order: OrderWithRelations) {
    setConfirmOpen(false);
    setSelectedOrder(order);
    setDrawerMode("edit");
    setDrawerOpen(true);
  }

  function handleCreateChallan(order: OrderWithRelations) {
    setChallanOrder(order);
    setChallanOpen(true);
  }

  async function handleStatusChange(id: string, status: OrderStatus) {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.message ?? "Status update failed");
    }
    setRefreshKey((k) => k + 1);
  }

  async function handleUpdate(
    id: string,
    fields: Record<string, string | undefined>,
    itemEdits?: Record<string, { quantity: number; unit: string }>
  ) {
    const body: Record<string, unknown> = {};
    if (fields.notes !== undefined) body.notes = fields.notes;
    if (fields.delivery_date) body.deliveryDate = fields.delivery_date;
    if (itemEdits && Object.keys(itemEdits).length > 0) {
      body.items = Object.entries(itemEdits).map(([itemId, { quantity, unit }]) => ({
        id: itemId,
        quantity,
        unit,
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
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-foreground">Orders</h2>
        <p className="text-sm text-muted-foreground">
          {total > 0 ? `${total} order${total !== 1 ? "s" : ""} found` : "Manage seed orders"}
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="all">All Orders</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="dispatched">Dispatched</TabsTrigger>
        </TabsList>
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
        onConfirm={handleConfirm}
        onCreateChallan={handleCreateChallan}
      />

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

      {/* Order detail drawer */}
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
        onRefresh={() => setRefreshKey((k) => k + 1)}
      />

      {/* Confirm modal */}
      <OrderConfirmModal
        order={confirmOrder}
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onEdit={handleConfirmEdit}
        onConfirmed={() => {
          setConfirmOpen(false);
          setRefreshKey((k) => k + 1);
        }}
      />

      {/* Challan dialog */}
      <CreateChallanDialog
        order={challanOrder}
        open={challanOpen}
        onClose={() => setChallanOpen(false)}
        onDispatched={() => {
          setRefreshKey((k) => k + 1);
          setChallanOrder(null);
        }}
      />
    </div>
  );
}
