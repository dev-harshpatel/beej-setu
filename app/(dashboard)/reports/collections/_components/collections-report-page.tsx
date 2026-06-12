"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BanknoteIcon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { DatePicker } from "@/components/ui/date-picker";
import { Combobox } from "@/components/ui/combobox";
import { ReportFilterBar } from "../../_components/report-filter-bar";
import { StatChip } from "../../_components/stat-chip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CollectionWithRelations } from "@/lib/database/collections.queries";
import { formatCurrencyWhole as fmt, formatDateMedium } from "@/lib/utils";
import { PAYMENT_MODE_LABELS } from "@/constants/payment.constants";
import type { PaymentMode } from "@/types/database.types";

// ── Payment mode helpers ──────────────────────────────────────────────────────
const PAYMENT_MODE_CLASSES: Record<PaymentMode, string> = {
  CASH:          "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  BANK_TRANSFER: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  UPI:           "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  CHEQUE:        "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

function PaymentBadge({ mode }: { mode: string }) {
  const cls = PAYMENT_MODE_CLASSES[mode as PaymentMode] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {PAYMENT_MODE_LABELS[mode as PaymentMode] ?? mode}
    </span>
  );
}

// ── Dealer type (from /api/dealers list) ──────────────────────────────────────
interface DealerOption {
  id: string;
  name: string;
}

// ── Active filters snapshot ───────────────────────────────────────────────────
interface ActiveFilters {
  dealerId: string;
  dateFrom: string;
  dateTo:   string;
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function CollectionsReportPage() {
  const [dealerId,  setDealerId]  = useState("");
  const [dateFrom,  setDateFrom]  = useState("");
  const [dateTo,    setDateTo]    = useState("");
  const [activeFilters, setActiveFilters] = useState<ActiveFilters | null>(null);

  // Fetch dealer list — server already scopes STAFF to their own dealers
  const { data: dealers = [] } = useQuery<DealerOption[]>({
    queryKey: ["dealers-report-list"],
    queryFn:  async () => {
      const res  = await fetch("/api/dealers?pageSize=500&status=ACTIVE");
      const json = await res.json();
      return (json.data?.data ?? []) as DealerOption[];
    },
    staleTime: 5 * 60_000,
  });

  // Fetch collections — only runs when user clicks Generate
  const { data: collections, isFetching } = useQuery<CollectionWithRelations[]>({
    queryKey: ["report-collections", activeFilters],
    queryFn:  async () => {
      if (!activeFilters) return [];
      const params = new URLSearchParams();
      if (activeFilters.dealerId) params.set("dealerId", activeFilters.dealerId);
      if (activeFilters.dateFrom) params.set("dateFrom", activeFilters.dateFrom);
      if (activeFilters.dateTo)   params.set("dateTo",   activeFilters.dateTo);
      const res  = await fetch(`/api/collections?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error("Failed to fetch collections");
      return json.data as CollectionWithRelations[];
    },
    enabled: !!activeFilters,
  });

  const rows       = collections ?? [];
  const hasReport  = !!activeFilters;

  // ── Summary computations ──────────────────────────────────────────────────
  const totalAmount  = rows.reduce((s, r) => s + r.amount, 0);
  const uniqueDealers = new Set(rows.map((r) => r.dealer_id)).size;

  const byMode = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.payment_mode] = (acc[r.payment_mode] ?? 0) + r.amount;
    return acc;
  }, {});

  function handleGenerate() {
    setActiveFilters({ dealerId, dateFrom, dateTo });
  }

  function handleClear() {
    setDealerId(""); setDateFrom(""); setDateTo("");
    setActiveFilters(null);
  }

  const selectedDealer = dealers.find((d) => d.id === activeFilters?.dealerId);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 sm:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
        <h1 className="text-sm font-medium">Collections Report</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-4 pb-6 flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-semibold">Collections Report</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Filter by date range and dealer to see how much has been collected.
          </p>
        </div>

        {/* ── Filters ───────────────────────────────────────────────── */}
        <ReportFilterBar
          onGenerate={handleGenerate}
          onClear={handleClear}
          loading={isFetching}
          hasReport={hasReport}
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Dealer (optional)</label>
            <Combobox
              className="w-60"
              value={dealerId}
              onValueChange={(v) => setDealerId(v === "_all" ? "" : v)}
              placeholder="All dealers"
              searchPlaceholder="Search dealer…"
              items={[
                { value: "_all", label: "All dealers" },
                ...dealers.map((d) => ({ value: d.id, label: d.name })),
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
          <div className="flex flex-wrap gap-2 items-center">
            <StatChip>{rows.length} collection{rows.length !== 1 ? "s" : ""}</StatChip>
            <StatChip accent className="font-semibold flex items-center gap-1.5">
              <BanknoteIcon className="size-3.5" />
              {fmt(totalAmount)} total
            </StatChip>
            {!selectedDealer && (
              <StatChip>{uniqueDealers} dealer{uniqueDealers !== 1 ? "s" : ""}</StatChip>
            )}
            {selectedDealer && <StatChip>{selectedDealer.name}</StatChip>}
            {(Object.entries(byMode) as [PaymentMode, number][]).map(([mode, amount]) => (
              <div key={mode} className={`rounded-md px-3 py-1.5 text-xs font-medium ${PAYMENT_MODE_CLASSES[mode] ?? "bg-muted"}`}>
                {PAYMENT_MODE_LABELS[mode] ?? mode}: {fmt(amount)}
              </div>
            ))}
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
                No collections found for the selected filters.
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Dealer</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead>Payment Mode</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="hidden md:table-cell">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDateMedium(row.collection_date)}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {row.dealer?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.staff?.name ?? "—"}
                        </TableCell>
                        <TableCell>
                          <PaymentBadge mode={row.payment_mode} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold text-sm">
                          {fmt(row.amount)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-48 truncate">
                          {row.notes ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  {/* Totals row */}
                  <tfoot>
                    <tr className="border-t border-border bg-muted/50">
                      <td colSpan={4} className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                        Total ({rows.length} collection{rows.length !== 1 ? "s" : ""})
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-bold text-sm">
                        {fmt(totalAmount)}
                      </td>
                      <td className="hidden md:table-cell" />
                    </tr>
                  </tfoot>
                </Table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
