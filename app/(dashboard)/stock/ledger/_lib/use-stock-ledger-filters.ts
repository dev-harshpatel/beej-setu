"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { LedgerFilters } from "../_components/stock-ledger-filters";
import type { BatchWithStatus } from "@/lib/database/stock-movements.queries";

export function useStockLedgerFilters() {
  const searchParams = useSearchParams();

  // Initialize batchNumber from the URL query param set by the stock table
  // "View Ledger" button (e.g. /stock/ledger?batch=B2025-001).
  // Using a lazy initializer avoids a useEffect + setState cycle.
  const [filters, setFilters] = useState<LedgerFilters>(() => ({
    cropId: "", variety: "", packSize: "",
    batchNumber: searchParams.get("batch") ?? "",
  }));

  const [selectedBatch, setSelectedBatch] = useState<BatchWithStatus | null>(null);
  const [movementPage, setMovementPage]   = useState(1);
  const [dateFrom, setDateFrom]           = useState("");
  const [dateTo, setDateTo]               = useState("");

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

  const hasFilters = !!(filters.cropId || filters.variety || filters.packSize || filters.batchNumber);

  return {
    filters, selectedBatch, movementPage, dateFrom, dateTo, hasFilters,
    handleFiltersChange, handleBatchSelect, handleDateRange, setMovementPage,
  };
}
