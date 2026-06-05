"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/constants/roles.constants";
import { PAGINATION_DEFAULTS } from "@/constants/app.constants";
import { StockHeader } from "./stock-header";
import { StockFilters, type StockFilters as StockFiltersType } from "./stock-filters";
import { StockTable } from "./stock-table";
import { StockEmpty } from "./stock-empty";
import { StockPagination } from "./stock-pagination";
import { StockFormDialog } from "./stock-form-dialog";
import { StockDeleteDialog } from "./stock-delete-dialog";
import { StockUploadDialog } from "./stock-upload-dialog";
import { QUERY_KEYS } from "@/hooks/use-realtime-invalidation";
import type { SeedStockWithDetails } from "@/lib/database/stock.queries";
import type { CropRow } from "@/types/database.types";
import type { SeedProductWithCropRow } from "@/lib/database/seeds.queries";

const PAGE_SIZE = PAGINATION_DEFAULTS.PAGE_SIZE;

export function StockPage() {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.STOCK_MANAGE);

  const [page, setPage]         = useState(1);
  const [filters, setFilters]   = useState<StockFiltersType>({ search: "", cropId: "" });
  const [formOpen, setFormOpen]       = useState(false);
  const [editStock, setEditStock]     = useState<SeedStockWithDetails | null>(null);
  const [deleteOpen, setDeleteOpen]   = useState(false);
  const [deleteStock, setDeleteStock] = useState<SeedStockWithDetails | null>(null);
  const [uploadOpen, setUploadOpen]   = useState(false);

  // Reset page on search change
  useEffect(() => { setPage(1); }, [filters.search]);

  // ── Stock list — fetch all, filter client-side ────────────
  // No search param: search is instant and zero round-trips.
  // Realtime invalidation automatically refetches when seed_stock changes.
  const { data: stockData, isFetching: stockFetching, refetch: refetchStock } = useQuery({
    queryKey: [
      ...QUERY_KEYS.STOCK,
      { cropId: filters.cropId },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({ pageSize: "500" });
      if (filters.cropId) params.set("cropId", filters.cropId);
      const res  = await fetch(`/api/stock?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error("Failed to fetch stock");
      return json.data as { data: SeedStockWithDetails[]; total: number };
    },
    placeholderData: keepPreviousData,
  });

  const allRows      = useMemo(() => stockData?.data ?? [], [stockData]);
  const loading      = stockFetching && !stockData;
  const isRefreshing = stockFetching && !!stockData;

  // Client-side search filter (instant)
  const filteredRows = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((r) =>
      r.seed_product?.variety.toLowerCase().includes(q) ||
      r.seed_product?.pack_size.toLowerCase().includes(q) ||
      r.seed_product?.crop?.name.toLowerCase().includes(q),
    );
  }, [allRows, filters.search]);

  // Client-side pagination
  const total      = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows       = useMemo(
    () => filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredRows, page],
  );

  // ── Crops (filter dropdown) ───────────────────────────────
  const { data: crops = [] } = useQuery({
    queryKey: ["crops"],
    queryFn: async () => {
      const res  = await fetch("/api/crops");
      const json = await res.json();
      return (json.data ?? []) as CropRow[];
    },
    staleTime: 10 * 60_000,
  });

  // ── Seed products (form dropdown) ────────────────────────
  const { data: products = [] } = useQuery({
    queryKey: ["seed-products-list"],
    queryFn: async () => {
      const res  = await fetch("/api/seeds?pageSize=200");
      const json = await res.json();
      return (json.data?.data ?? []) as SeedProductWithCropRow[];
    },
    enabled: canManage,
    staleTime: 5 * 60_000,
  });

  function handleFiltersChange(next: StockFiltersType) { setFilters(next); setPage(1); }

  const hasFilters = !!(filters.search || filters.cropId);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-4 px-4 sm:px-5 pt-3 sm:pt-4 pb-3 shrink-0">
        <StockHeader total={total} canManage={canManage} isRefreshing={isRefreshing} onRefresh={() => refetchStock()} onAdd={() => { setEditStock(null); setFormOpen(true); }} onUpload={() => setUploadOpen(true)} />
        <StockFilters filters={filters} crops={crops} onChange={handleFiltersChange} />
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col px-4 sm:px-5">
        {!loading && rows.length === 0 ? (
          <StockEmpty hasFilters={hasFilters} />
        ) : (
          <StockTable
            rows={rows} loading={loading} canManage={canManage}
            onEdit={(r) => { setEditStock(r); setFormOpen(true); }}
            onDelete={(r) => { setDeleteStock(r); setDeleteOpen(true); }}
          />
        )}
      </div>

      <div className="shrink-0 bg-background border-t px-4 sm:px-5 py-2.5">
        <StockPagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <StockUploadDialog
        open={uploadOpen} onOpenChange={setUploadOpen}
        onSuccess={() => setUploadOpen(false)}
      />

      {/* onSuccess is now a no-op — realtime invalidation handles the refetch */}
      <StockFormDialog
        open={formOpen} onOpenChange={setFormOpen}
        stock={editStock} seedProducts={products}
        onSuccess={() => setFormOpen(false)}
      />
      <StockDeleteDialog
        open={deleteOpen} onOpenChange={setDeleteOpen}
        stock={deleteStock}
        onSuccess={() => { setDeleteOpen(false); setDeleteStock(null); }}
      />
    </div>
  );
}
