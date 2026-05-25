"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { XIcon } from "lucide-react";
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
import type { SeedProductWithCropRow } from "@/lib/database/seeds.queries";
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

// ── Row type from API ─────────────────────────────────────────────────────────
interface ProductReportRow {
  order_id:         string;
  order_number:     string;
  order_date:       string;
  order_status:     string;
  dealer_id:        string | null;
  dealer_name:      string | null;
  dealer_territory: string | null;
  seed_id:          string;
  crop_name:        string | null;
  variety:          string | null;
  pack_size:        string | null;
  quantity:         number;
  unit:             string;
}

interface ActiveFilters {
  seedId: string;
  dateFrom: string;
  dateTo: string;
}

// ── Product Report Page ───────────────────────────────────────────────────────
export default function ProductReportPage() {
  const [seedId, setSeedId]   = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [activeFilters, setActiveFilters] = useState<ActiveFilters | null>(null);

  const { data: products = [] } = useQuery({
    queryKey: ["seeds-report-list"],
    queryFn: async () => {
      const res  = await fetch("/api/seeds?pageSize=200");
      const json = await res.json();
      return (json.data?.data ?? []) as SeedProductWithCropRow[];
    },
    staleTime: 5 * 60_000,
  });

  const { data: reportData, isFetching } = useQuery({
    queryKey: ["report-product", activeFilters],
    queryFn: async () => {
      if (!activeFilters) return null;
      const params = new URLSearchParams();
      if (activeFilters.seedId)   params.set("seedId",   activeFilters.seedId);
      if (activeFilters.dateFrom) params.set("dateFrom", activeFilters.dateFrom);
      if (activeFilters.dateTo)   params.set("dateTo",   activeFilters.dateTo);
      const res  = await fetch(`/api/reports/product?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error("Failed to fetch report");
      return json.data as { data: ProductReportRow[]; total: number };
    },
    enabled: !!activeFilters,
  });

  const rows     = reportData?.data ?? [];
  const hasReport = !!activeFilters;

  const selectedProduct = products.find((p) => p.id === activeFilters?.seedId);

  function handleGenerate() {
    setActiveFilters({ seedId, dateFrom, dateTo });
  }

  function handleClear() {
    setSeedId("");
    setDateFrom("");
    setDateTo("");
    setActiveFilters(null);
  }

  // Aggregate total quantity per dealer for the summary row
  const dealerTotals = rows.reduce<Record<string, number>>((acc, row) => {
    const key = row.dealer_name ?? "Unknown";
    acc[key] = (acc[key] ?? 0) + row.quantity;
    return acc;
  }, {});

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 sm:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
        <h1 className="text-sm font-medium">Product Report</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-4 pb-6 flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-semibold">Product-wise Report</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            See which product went to which dealer, in what quantity, and when.
          </p>
        </div>

        {/* ── Filters ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 items-end rounded-lg border border-border p-4 bg-card">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Product (optional)</label>
            <Select value={seedId} onValueChange={(v) => setSeedId(v ?? "")}>
              <SelectTrigger className="w-60">
                <SelectValue placeholder="All products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All products</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.crop.name} — {p.variety} ({p.pack_size})
                  </SelectItem>
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
            <Button onClick={handleGenerate} disabled={isFetching}>
              {isFetching ? "Loading…" : "Generate Report"}
            </Button>
            {hasReport && (
              <Button variant="ghost" size="icon" onClick={handleClear} title="Clear report">
                <XIcon className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {/* ── Summary chips ─────────────────────────────────────────── */}
        {hasReport && !isFetching && rows.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <div className="rounded-md bg-muted px-3 py-1.5 text-xs font-medium">
              {rows.length} line item{rows.length !== 1 ? "s" : ""}
            </div>
            <div className="rounded-md bg-muted px-3 py-1.5 text-xs font-medium">
              {Object.keys(dealerTotals).length} dealer{Object.keys(dealerTotals).length !== 1 ? "s" : ""}
            </div>
            <div className="rounded-md bg-muted px-3 py-1.5 text-xs font-medium">
              {rows.reduce((s, r) => s + r.quantity, 0)} total units
            </div>
            {selectedProduct && (
              <div className="rounded-md bg-accent/20 text-accent-foreground px-3 py-1.5 text-xs font-medium">
                {selectedProduct.crop.name} — {selectedProduct.variety} ({selectedProduct.pack_size})
              </div>
            )}
          </div>
        )}

        {/* ── Results table ─────────────────────────────────────────── */}
        {hasReport && (
          <div>
            {isFetching ? (
              <div className="rounded-lg border border-border py-10 text-center text-sm text-muted-foreground">
                Loading report…
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-lg border border-border py-10 text-center text-sm text-muted-foreground">
                No data found for the selected filters.
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Dealer</TableHead>
                      <TableHead className="hidden sm:table-cell">Territory</TableHead>
                      <TableHead className="hidden md:table-cell">Crop</TableHead>
                      <TableHead>Variety</TableHead>
                      <TableHead className="hidden md:table-cell">Pack Size</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="hidden lg:table-cell">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => (
                      <TableRow key={`${row.order_id}-${row.seed_id}-${i}`}>
                        <TableCell className="font-mono text-xs font-semibold">
                          {row.order_number}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(row.order_date).toLocaleDateString("en-IN", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {row.dealer_name ?? "—"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {row.dealer_territory ?? "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {row.crop_name ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {row.variety ?? "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {row.pack_size ?? "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {row.quantity}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.unit}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <StatusBadge status={row.order_status} />
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
    </>
  );
}
