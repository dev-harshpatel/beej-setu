"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EyeIcon, XIcon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { DealerRow } from "@/types/database.types";
import type { OrderWithRelations } from "@/types/order.types";
import { ORDER_STATUS_LABELS } from "@/constants/order-status.constants";

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  PENDING:              "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  APPROVED:             "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  PARTIALLY_APPROVED:   "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  HOLD:                 "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  CANCELLED:            "bg-destructive/10 text-destructive",
  GODOWN_DISPATCHED:    "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  TRANSPORT_DISPATCHED: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  SHIPPED:              "bg-accent text-accent-foreground",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? "bg-muted text-muted-foreground"}`}>
      {ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] ?? status}
    </span>
  );
}

// ── Order detail sheet ────────────────────────────────────────────────────────
function OrderDetailSheet({
  order,
  onClose,
}: {
  order: OrderWithRelations | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!order} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pr-8">
          <SheetTitle className="font-mono text-sm">
            {order?.order_number ?? "Order Details"}
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            {order && new Date(order.created_at).toLocaleDateString("en-IN", {
              day: "2-digit", month: "short", year: "numeric",
            })}
          </p>
        </SheetHeader>

        {order && (
          <div className="mt-4 flex flex-col gap-4">
            {/* Status + transport */}
            <div className="flex items-center gap-3">
              <StatusBadge status={order.status} />
              {order.transport_name && (
                <span className="text-xs text-muted-foreground">
                  via {order.transport_name}
                </span>
              )}
            </div>

            {/* Dealer info */}
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-muted-foreground mb-1">Dealer</p>
              <p className="font-medium">{order.dealer?.name}</p>
              {order.dealer?.territory && (
                <p className="text-muted-foreground text-xs">{order.dealer.territory}</p>
              )}
            </div>

            {/* Order items */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Items ({order.items?.length ?? 0})
              </p>
              <div className="rounded-md border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Product</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Qty</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(order.items ?? []).map((item) => (
                      <tr key={item.id} className="border-t border-border">
                        <td className="px-3 py-2">
                          <p className="font-medium">{item.seed?.variety ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.seed?.crops?.name} · {item.seed?.pack_size}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                {order.notes}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Dealer Report Page ────────────────────────────────────────────────────────
interface ActiveFilters {
  dealerId: string;
  dateFrom: string;
  dateTo: string;
}

export default function DealerReportPage() {
  const [dealerId, setDealerId]       = useState("");
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");
  const [activeFilters, setActiveFilters] = useState<ActiveFilters | null>(null);
  const [detailOrder, setDetailOrder] = useState<OrderWithRelations | null>(null);

  const { data: dealers = [] } = useQuery({
    queryKey: ["dealers-report-list"],
    queryFn: async () => {
      const res  = await fetch("/api/dealers?pageSize=200");
      const json = await res.json();
      return (json.data?.data ?? []) as DealerRow[];
    },
    staleTime: 5 * 60_000,
  });

  const { data: ordersData, isFetching } = useQuery({
    queryKey: ["report-dealer", activeFilters],
    queryFn: async () => {
      if (!activeFilters) return null;
      const params = new URLSearchParams({ dealerId: activeFilters.dealerId, pageSize: "500" });
      if (activeFilters.dateFrom) params.set("dateFrom", activeFilters.dateFrom);
      if (activeFilters.dateTo)   params.set("dateTo",   activeFilters.dateTo);
      const res  = await fetch(`/api/orders?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error("Failed to fetch orders");
      return json.data as { data: OrderWithRelations[]; total: number };
    },
    enabled: !!activeFilters,
  });

  const selectedDealer = dealers.find((d) => d.id === (activeFilters?.dealerId ?? dealerId));
  const reportDealer   = dealers.find((d) => d.id === activeFilters?.dealerId);
  const orders         = ordersData?.data ?? [];
  const hasReport      = !!activeFilters;

  function handleGenerate() {
    if (!dealerId) return;
    setActiveFilters({ dealerId, dateFrom, dateTo });
  }

  function handleClear() {
    setDealerId("");
    setDateFrom("");
    setDateTo("");
    setActiveFilters(null);
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 sm:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
        <h1 className="text-sm font-medium">Dealer Report</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-4 pb-6 flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-semibold">Dealer-wise Report</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            View all orders placed by a specific dealer within a date range.
          </p>
        </div>

        {/* ── Filters ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 items-end rounded-lg border border-border p-4 bg-card">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Dealer *</label>
            <Select value={dealerId} onValueChange={(v) => setDealerId(v ?? "")}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Select dealer…" />
              </SelectTrigger>
              <SelectContent>
                {dealers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <Input
              type="date"
              className="w-40"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <Input
              type="date"
              className="w-40"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div className="flex gap-2 items-end">
            <Button onClick={handleGenerate} disabled={!dealerId || isFetching}>
              {isFetching ? "Loading…" : "Generate Report"}
            </Button>
            {hasReport && (
              <Button variant="ghost" size="icon" onClick={handleClear} title="Clear report">
                <XIcon className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {/* ── Dealer info card ──────────────────────────────────────── */}
        {reportDealer && (
          <div className="rounded-lg border border-border p-4 bg-card">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
              Dealer Information
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-semibold text-sm mt-0.5">{reportDealer.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contact</p>
                <p className="font-medium text-sm mt-0.5">{reportDealer.contact}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Territory</p>
                <p className="font-medium text-sm mt-0.5">{reportDealer.territory ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-medium text-sm mt-0.5">{reportDealer.status}</p>
              </div>
            </div>
            {(activeFilters?.dateFrom || activeFilters?.dateTo) && (
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                Period:{" "}
                {activeFilters.dateFrom
                  ? new Date(activeFilters.dateFrom).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                  : "—"}
                {" → "}
                {activeFilters.dateTo
                  ? new Date(activeFilters.dateTo).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                  : "—"}
              </p>
            )}
          </div>
        )}

        {/* ── Orders table ──────────────────────────────────────────── */}
        {hasReport && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Orders{orders.length > 0 ? ` (${orders.length})` : ""}
              </h3>
            </div>

            {isFetching ? (
              <div className="rounded-lg border border-border py-10 text-center text-sm text-muted-foreground">
                Loading orders…
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-lg border border-border py-10 text-center text-sm text-muted-foreground">
                No orders found for the selected filters.
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Items</TableHead>
                      <TableHead className="hidden md:table-cell">Transport</TableHead>
                      <TableHead className="hidden md:table-cell">Delivery Date</TableHead>
                      <TableHead className="w-16" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs font-semibold">
                          {order.order_number}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString("en-IN", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={order.status} />
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {order.items?.length ?? 0}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {order.transport_name ?? "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {order.delivery_date
                            ? new Date(order.delivery_date).toLocaleDateString("en-IN", {
                                day: "2-digit", month: "short", year: "numeric",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View order details"
                            onClick={() => setDetailOrder(order)}
                          >
                            <EyeIcon className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </div>

      <OrderDetailSheet order={detailOrder} onClose={() => setDetailOrder(null)} />
    </>
  );
}
