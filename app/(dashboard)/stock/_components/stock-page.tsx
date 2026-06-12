"use client";

import { useMemo, useState } from "react";
import { PAGINATION_DEFAULTS } from "@/constants/app.constants";
import { useStockData } from "../_lib/use-stock-data";
import { StockHeader } from "./stock-header";
import { StockFilters, type StockFilters as StockFiltersType } from "./stock-filters";
import { StockTable } from "./stock-table";
import { StockEmpty } from "./stock-empty";
import { StockPagination } from "./stock-pagination";
import { StockFormDialog } from "./stock-form-dialog";
import { StockDeleteDialog } from "./stock-delete-dialog";
import { StockUploadDialog } from "./stock-upload-dialog";
import type { SeedStockWithDetails } from "@/lib/database/stock.queries";

const PAGE_SIZE = PAGINATION_DEFAULTS.PAGE_SIZE;

export function StockPage() {
  const [page, setPage]       = useState(1);
  const [filters, setFilters] = useState<StockFiltersType>({ search: "", cropId: "" });
  const [formOpen, setFormOpen]       = useState(false);
  const [editStock, setEditStock]     = useState<SeedStockWithDetails | null>(null);
  const [deleteOpen, setDeleteOpen]   = useState(false);
  const [deleteStock, setDeleteStock] = useState<SeedStockWithDetails | null>(null);
  const [uploadOpen, setUploadOpen]   = useState(false);

  const { allRows, loading, isRefreshing, crops, products, canManage, refetchStock } =
    useStockData({ cropId: filters.cropId });

  function handleFiltersChange(next: StockFiltersType) {
    setFilters(next);
    setPage(1);
  }

  // Client-side search filter (instant, zero round-trips)
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

  const hasFilters = !!(filters.search || filters.cropId);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-4 px-4 sm:px-5 pt-3 sm:pt-4 pb-3 shrink-0">
        <StockHeader
          total={total} canManage={canManage} isRefreshing={isRefreshing}
          onRefresh={() => refetchStock()}
          onAdd={() => { setEditStock(null); setFormOpen(true); }}
          onUpload={() => setUploadOpen(true)}
        />
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

      {/* key remounts when switching between create / different edit targets,
          re-initializing form state without a useEffect */}
      <StockFormDialog
        key={editStock?.id ?? "new"}
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
