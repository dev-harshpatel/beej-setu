"use client";

import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { HistoryIcon } from "lucide-react";
import { StockLedgerFilters, type LedgerFilters } from "./stock-ledger-filters";
import { BatchList } from "./batch-list";
import { BatchSummaryCard } from "./batch-summary-card";
import { BatchMovementTimeline, exportToCsv } from "./batch-movement-timeline";
import type { CropRow } from "@/types/database.types";
import type { SeedProductWithCropRow } from "@/lib/database/seeds.queries";
import type {
  BatchWithStatus,
  BatchSummary,
  ReconciliationResult,
  StockMovementEntry,
} from "@/lib/database/stock-movements.queries";

const EMPTY_FILTERS: LedgerFilters = { cropId: "", variety: "", packSize: "", batchNumber: "" };

export function StockLedgerPage() {
  const searchParams = useSearchParams();

  const [filters, setFilters]       = useState<LedgerFilters>(EMPTY_FILTERS);
  const [selectedBatch, setSelectedBatch] = useState<BatchWithStatus | null>(null);
  const [movementPage, setMovementPage]   = useState(1);
  const [dateFrom, setDateFrom]           = useState("");
  const [dateTo, setDateTo]               = useState("");

  // Pre-select from URL query params (coming from stock table "View Ledger" button)
  useEffect(() => {
    const seedId = searchParams.get("seedId");
    const batch  = searchParams.get("batch");
    if (batch) setFilters((f) => ({ ...f, batchNumber: batch }));
    // seedId is used implicitly when the batch list loads and we auto-select
    void seedId;
  }, [searchParams]);

  // ── Crops dropdown ────────────────────────────────────────
  const { data: crops = [] } = useQuery<CropRow[]>({
    queryKey: ["crops"],
    queryFn: async () => {
      const res  = await fetch("/api/crops");
      const json = await res.json();
      return (json.data ?? []) as CropRow[];
    },
    staleTime: 10 * 60_000,
  });

  // ── Seed products for filter dropdowns ────────────────────
  const { data: seedProducts = [] } = useQuery<SeedProductWithCropRow[]>({
    queryKey: ["seed-products-list"],
    queryFn: async () => {
      const res  = await fetch("/api/seeds?pageSize=200");
      const json = await res.json();
      return (json.data?.data ?? []) as SeedProductWithCropRow[];
    },
    staleTime: 5 * 60_000,
  });

  // ── Batch list ────────────────────────────────────────────
  const hasFilters = !!(filters.cropId || filters.variety || filters.packSize || filters.batchNumber);
  const { data: batches = [], isFetching: batchesFetching } = useQuery<BatchWithStatus[]>({
    queryKey: ["stock-batches", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.cropId)      params.set("cropId",      filters.cropId);
      if (filters.variety)     params.set("variety",     filters.variety);
      if (filters.packSize)    params.set("packSize",    filters.packSize);
      if (filters.batchNumber) params.set("batchNumber", filters.batchNumber);
      const res  = await fetch(`/api/stock/batches?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error("Failed to fetch batches");
      return json.data as BatchWithStatus[];
    },
    enabled: hasFilters,
    placeholderData: keepPreviousData,
  });

  // ── Movements ─────────────────────────────────────────────
  const { data: movementsData, isFetching: movementsFetching } = useQuery<{
    movements: StockMovementEntry[];
    summary: BatchSummary;
    total: number;
  }>({
    queryKey: ["stock-movements", selectedBatch?.seed_id, selectedBatch?.batch_number, movementPage, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({
        seedId:      selectedBatch!.seed_id,
        batchNumber: selectedBatch!.batch_number,
        page:        String(movementPage),
        pageSize:    "50",
      });
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo)   params.set("dateTo",   dateTo);
      const res  = await fetch(`/api/stock/movements?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error("Failed to fetch movements");
      return json.data as { movements: StockMovementEntry[]; summary: BatchSummary; total: number };
    },
    enabled: !!selectedBatch,
    placeholderData: keepPreviousData,
  });

  // ── Reconciliation ────────────────────────────────────────
  const { data: reconciliation = null } = useQuery<ReconciliationResult | null>({
    queryKey: ["stock-reconciliation", selectedBatch?.seed_id, selectedBatch?.batch_number],
    queryFn: async () => {
      const params = new URLSearchParams({
        seedId:      selectedBatch!.seed_id,
        batchNumber: selectedBatch!.batch_number,
      });
      const res  = await fetch(`/api/stock/reconciliation?${params}`);
      const json = await res.json();
      if (!json.success) return null;
      return json.data as ReconciliationResult;
    },
    enabled: !!selectedBatch,
  });

  // ── Handlers ──────────────────────────────────────────────
  function handleFiltersChange(next: LedgerFilters) {
    setFilters(next);
    setSelectedBatch(null);
    setMovementPage(1);
    setDateFrom("");
    setDateTo("");
  }

  function handleBatchSelect(batch: BatchWithStatus) {
    setSelectedBatch(batch);
    setMovementPage(1);
    setDateFrom("");
    setDateTo("");
  }

  function handleDateRange(from: string, to: string) {
    setDateFrom(from);
    setDateTo(to);
    setMovementPage(1);
  }

  function handleExportCsv() {
    if (!movementsData?.movements || !selectedBatch) return;
    exportToCsv(movementsData.movements, selectedBatch.batch_number);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <div className="flex items-center gap-2">
        <HistoryIcon className="size-5 text-muted-foreground" />
        <div>
          <h1 className="text-lg font-semibold leading-none">Stock Ledger</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Track every movement for any seed batch.</p>
        </div>
      </div>

      {/* Filters */}
      <StockLedgerFilters
        filters={filters}
        crops={crops}
        seedProducts={seedProducts}
        onChange={handleFiltersChange}
      />

      {/* Batch list — shown when any filter is active */}
      {hasFilters && (
        <BatchList
          batches={batches}
          loading={batchesFetching && batches.length === 0}
          selectedBatchNumber={selectedBatch?.batch_number ?? null}
          onSelect={handleBatchSelect}
        />
      )}

      {!hasFilters && (
        <div className="rounded-lg border border-dashed border-border flex items-center justify-center h-40 text-sm text-muted-foreground">
          Use the filters above to find a batch, then click a row to view its history.
        </div>
      )}

      {/* Batch detail section */}
      {selectedBatch && movementsData && (
        <>
          <BatchSummaryCard
            batch={selectedBatch}
            summary={movementsData.summary}
            reconciliation={reconciliation}
            onExportCsv={handleExportCsv}
            onPrint={handlePrint}
          />
          <BatchMovementTimeline
            movements={movementsData.movements}
            loading={movementsFetching}
            total={movementsData.total}
            page={movementPage}
            pageSize={50}
            dateFrom={dateFrom}
            dateTo={dateTo}
            packetsPerBag={selectedBatch.packets_per_bag}
            onPageChange={setMovementPage}
            onDateRangeChange={handleDateRange}
          />
        </>
      )}
    </div>
  );
}
