"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StockMovementEntry } from "@/lib/database/stock-movements.queries";

interface Props {
  movements: StockMovementEntry[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  dateFrom: string;
  dateTo: string;
  packetsPerBag: number;
  onPageChange: (page: number) => void;
  onDateRangeChange: (from: string, to: string) => void;
}

const TYPE_BADGE: Record<string, string> = {
  ADD:            "bg-emerald-100 text-emerald-700",
  ADJUSTMENT_IN:  "bg-teal-100 text-teal-700",
  ADJUSTMENT_OUT: "bg-orange-100 text-orange-600",
  DISPATCH:       "bg-destructive/15 text-destructive",
};

const TYPE_SIGN: Record<string, string> = {
  ADD:            "+",
  ADJUSTMENT_IN:  "+",
  ADJUSTMENT_OUT: "−",
  DISPATCH:       "−",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtQty(packets: number, ppb: number, sign: string) {
  const bags = Math.floor(packets / ppb);
  const pkts = packets % ppb;
  const parts = [];
  if (bags > 0) parts.push(`${sign}${bags} bags`);
  if (pkts > 0) parts.push(`${sign}${pkts} pkts`);
  if (parts.length === 0) parts.push(`${sign}0`);
  return parts.join(", ");
}

export function exportToCsv(movements: StockMovementEntry[], batchNumber: string) {
  const headers = ["Date", "Type", "Qty (pkts)", "Balance (pkts)", "By", "Dealer", "Order", "Notes"];
  const rows = movements.map((m) => [
    m.movement_date,
    m.movement_type,
    (TYPE_SIGN[m.movement_type] === "+" ? "+" : "-") + m.quantity_packets,
    m.running_balance_packets,
    m.movement_by_profile?.name ?? "",
    m.order?.dealer?.name ?? "",
    m.order?.order_number ?? "",
    (m.notes ?? "").replace(/,/g, ";"),
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ledger-${batchNumber}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function BatchMovementTimeline({
  movements, loading, total, page, pageSize,
  dateFrom, dateTo, packetsPerBag,
  onPageChange, onDateRangeChange,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const header = (
    <thead className="sticky top-0 z-10 [&_th]:bg-card">
      <tr className="border-b border-border text-left text-sm">
        <th className="px-3 py-2 font-medium text-muted-foreground w-28">Date</th>
        <th className="px-3 py-2 font-medium text-muted-foreground w-32">Type</th>
        <th className="px-3 py-2 font-medium text-muted-foreground text-right w-36">Quantity</th>
        <th className="px-3 py-2 font-medium text-muted-foreground text-right w-36">Balance After</th>
        <th className="px-3 py-2 font-medium text-muted-foreground">Actor</th>
        <th className="px-3 py-2 font-medium text-muted-foreground">Notes</th>
      </tr>
    </thead>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Date range filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0">From</Label>
          <Input
            type="date" className="h-8 text-sm w-36"
            value={dateFrom}
            onChange={(e) => onDateRangeChange(e.target.value, dateTo)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0">To</Label>
          <Input
            type="date" className="h-8 text-sm w-36"
            value={dateTo}
            onChange={(e) => onDateRangeChange(dateFrom, e.target.value)}
          />
        </div>
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground px-2"
            onClick={() => onDateRangeChange("", "")}>
            Clear dates
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-lg border border-border max-h-[480px]">
        <table className="w-full caption-bottom text-sm">
          {header}
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-3 py-2.5"><Skeleton className="h-4 w-24" /></td>
                  ))}
                </tr>
              ))
            ) : movements.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No movements found for this period.
                </td>
              </tr>
            ) : (
              movements.map((m) => {
                const sign = TYPE_SIGN[m.movement_type] ?? "+";
                const rb = m.running_balance_packets;
                const rbBags = Math.floor(rb / packetsPerBag);
                const rbPkts = rb % packetsPerBag;

                return (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {fmtDate(m.movement_date)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", TYPE_BADGE[m.movement_type])}>
                        {m.movement_type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs font-medium">
                      {fmtQty(m.quantity_packets, packetsPerBag, sign)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs">
                      {rbBags} bags{rbPkts > 0 ? `, ${rbPkts} pkts` : ""}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {m.movement_type === "DISPATCH" ? (
                        <div className="flex flex-col gap-0.5">
                          {m.movement_by_profile && <span>Staff: {m.movement_by_profile.name}</span>}
                          {m.order?.dealer && <span className="text-muted-foreground">→ {m.order.dealer.name}</span>}
                          {m.approved_by_profile && <span className="text-muted-foreground">Approved: {m.approved_by_profile.name}</span>}
                          {m.order && (
                            <a
                              href={`/orders?search=${m.order.order_number}`}
                              className="text-primary underline text-xs"
                            >
                              {m.order.order_number} →
                            </a>
                          )}
                        </div>
                      ) : (
                        <span>{m.movement_by_profile?.name ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-40 truncate">
                      {m.notes ?? ""}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground text-xs">
            Page {page} of {totalPages} ({total} movements)
          </span>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>
              <ChevronLeftIcon className="size-3.5" />Prev
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))}>
              Next<ChevronRightIcon className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
