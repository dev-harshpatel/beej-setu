"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { LedgerFilters } from "../_components/stock-ledger-filters";
import type { CropRow } from "@/types/database.types";
import type { SeedProductWithCropRow } from "@/lib/database/seeds.queries";
import type {
  BatchWithStatus,
  BatchSummary,
  ReconciliationResult,
  StockMovementEntry,
} from "@/lib/database/stock-movements.queries";

interface UseStockLedgerDataParams {
  filters: LedgerFilters;
  hasFilters: boolean;
  selectedBatch: BatchWithStatus | null;
  movementPage: number;
  dateFrom: string;
  dateTo: string;
}

export function useStockLedgerData({
  filters, hasFilters, selectedBatch, movementPage, dateFrom, dateTo,
}: UseStockLedgerDataParams) {
  const { data: crops = [] } = useQuery<CropRow[]>({
    queryKey: ["crops"],
    queryFn: async () => {
      const res  = await fetch("/api/crops");
      const json = await res.json();
      return (json.data ?? []) as CropRow[];
    },
    staleTime: 10 * 60_000,
  });

  const { data: seedProducts = [] } = useQuery<SeedProductWithCropRow[]>({
    queryKey: ["seed-products-list"],
    queryFn: async () => {
      const res  = await fetch("/api/seeds?pageSize=200");
      const json = await res.json();
      return (json.data?.data ?? []) as SeedProductWithCropRow[];
    },
    staleTime: 5 * 60_000,
  });

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

  const { data: movementsData, isFetching: movementsFetching } = useQuery<{
    movements: StockMovementEntry[];
    summary: BatchSummary;
    total: number;
  }>({
    queryKey: [
      "stock-movements",
      selectedBatch?.seed_id,
      selectedBatch?.batch_number,
      movementPage,
      dateFrom,
      dateTo,
    ],
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

  const { data: reconciliation = null } = useQuery<ReconciliationResult | null>({
    queryKey: [
      "stock-reconciliation",
      selectedBatch?.seed_id,
      selectedBatch?.batch_number,
    ],
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

  return { crops, seedProducts, batches, batchesFetching, movementsData, movementsFetching, reconciliation };
}
