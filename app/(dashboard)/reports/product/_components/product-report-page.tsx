"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { ROLES } from "@/constants/roles.constants";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SeedProductWithCropRow } from "@/lib/database/seeds.queries";
import { OrderStatusBadge } from "../../../orders/_components/order-status-badge";
import { ReportFilterBar } from "../../_components/report-filter-bar";
import { StatChip } from "../../_components/stat-chip";
import { formatDateMedium } from "@/lib/utils";
import type { OrderStatusValue } from "@/constants/order-status.constants";

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
  staffId?: string;
}

// ── Product Report Page ───────────────────────────────────────────────────────
export default function ProductReportPage() {
  const { user }   = useAuth();
  const isStaff    = user?.role === ROLES.STAFF;

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
      if (activeFilters.staffId)  params.set("staffId",  activeFilters.staffId);
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
    setActiveFilters({
      seedId,
      dateFrom,
      dateTo,
      staffId: isStaff && user ? user.id : undefined,
    });
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
        <ReportFilterBar
          onGenerate={handleGenerate}
          onClear={handleClear}
          loading={isFetching}
          hasReport={hasReport}
          note={isStaff && (
            <p className="w-full text-xs text-muted-foreground">
              Showing only your orders for the selected product.
            </p>
          )}
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Product (optional)</label>
            <Combobox
              className="w-72"
              value={seedId}
              onValueChange={(v) => setSeedId(v === "__all__" ? "" : v)}
              placeholder="All products"
              searchPlaceholder="Search crop, variety…"
              wrap
              items={[
                { value: "__all__", label: "All products" },
                ...products.map((p) => ({
                  value: p.id,
                  label: `${p.crop.name} — ${p.variety} (${p.pack_size})`,
                })),
              ]}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <DatePicker
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="From date"
              className="w-40"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <DatePicker
              value={dateTo}
              onChange={setDateTo}
              placeholder="To date"
              className="w-40"
            />
          </div>
        </ReportFilterBar>

        {/* ── Summary chips ─────────────────────────────────────────── */}
        {hasReport && !isFetching && rows.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <StatChip>{rows.length} line item{rows.length !== 1 ? "s" : ""}</StatChip>
            <StatChip>{Object.keys(dealerTotals).length} dealer{Object.keys(dealerTotals).length !== 1 ? "s" : ""}</StatChip>
            <StatChip>{rows.reduce((s, r) => s + r.quantity, 0)} total units</StatChip>
            {selectedProduct && (
              <StatChip accent>
                {selectedProduct.crop.name} — {selectedProduct.variety} ({selectedProduct.pack_size})
              </StatChip>
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
                          {formatDateMedium(row.order_date)}
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
                          <OrderStatusBadge status={row.order_status as OrderStatusValue} />
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
