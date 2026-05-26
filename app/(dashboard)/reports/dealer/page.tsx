"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EyeIcon, XIcon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
import { OrderStatusBadge } from "../../orders/_components/order-status-badge";
import type { DealerRow } from "@/types/database.types";
import type { OrderWithRelations } from "@/types/order.types";
import type { OrderStatusValue } from "@/constants/order-status.constants";

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
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0" showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="flex flex-row items-center justify-between border-b px-4 py-3 gap-0">
          <div className="flex items-center gap-3 min-w-0">
            <SheetTitle className="font-mono text-sm font-semibold truncate">
              {order?.order_number ?? "Order Details"}
            </SheetTitle>
            {order && <OrderStatusBadge status={order.status as OrderStatusValue} />}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <XIcon className="size-4" />
          </Button>
        </SheetHeader>

        {order && (
          <div className="flex flex-col gap-5 px-4 py-5">
            {/* Summary grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Date</span>
                <span className="text-sm font-medium">
                  {new Date(order.created_at).toLocaleDateString("en-IN", {
                    day: "2-digit", month: "short", year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Dealer</span>
                <span className="text-sm font-medium">{order.dealer?.name ?? "—"}</span>
                {order.dealer?.territory && (
                  <span className="text-xs text-muted-foreground">{order.dealer.territory}</span>
                )}
              </div>
              {order.staff && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Staff</span>
                  <span className="text-sm font-medium">{order.staff.name}</span>
                </div>
              )}
              {order.transport_name && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Transport</span>
                  <span className="text-sm font-medium">{order.transport_name}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Items */}
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">Order Items ({order.items?.length ?? 0})</h3>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Seed</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Unit</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(order.items ?? []).map((item) => (
                      <tr key={item.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 font-medium">
                          <div>{item.seed?.crops?.name ?? "—"}</div>
                          {item.seed?.variety && (
                            <div className="text-xs text-muted-foreground">
                              {item.seed.variety}{item.seed.pack_size ? ` · ${item.seed.pack_size}` : ""}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{item.unit ?? "—"}</td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <>
                <Separator />
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm">{order.notes}</p>
                </div>
              </>
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
            <DatePicker
              value={dateFrom}
              onChange={(v) => {
                setDateFrom(v);
                if (dateTo && v && v > dateTo) setDateTo("");
              }}
              placeholder="Start date"
              className="w-40"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <DatePicker
              value={dateTo}
              onChange={setDateTo}
              placeholder="End date"
              minDate={dateFrom || undefined}
              className="w-40"
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
                          <OrderStatusBadge status={order.status as OrderStatusValue} />
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
