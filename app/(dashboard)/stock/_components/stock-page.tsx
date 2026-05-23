"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
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
import type { SeedStockWithDetails } from "@/lib/database/stock.queries";
import type { CropRow } from "@/types/database.types";
import type { SeedProductWithCropRow } from "@/lib/database/seeds.queries";

const PAGE_SIZE = PAGINATION_DEFAULTS.PAGE_SIZE;

export function StockPage() {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.STOCK_MANAGE);

  const [isPending, startTransition] = useTransition();
  const [initialized, setInitialized] = useState(false);
  const loading = !initialized || isPending;

  const [rows, setRows]         = useState<SeedStockWithDetails[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [filters, setFilters]   = useState<StockFiltersType>({ search: "", cropId: "" });
  const [crops, setCrops]       = useState<CropRow[]>([]);
  const [products, setProducts] = useState<SeedProductWithCropRow[]>([]);

  const [formOpen, setFormOpen]     = useState(false);
  const [editStock, setEditStock]   = useState<SeedStockWithDetails | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteStock, setDeleteStock] = useState<SeedStockWithDetails | null>(null);

  const fetchStock = useCallback(() => {
    startTransition(async () => {
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
        if (filters.search) params.set("search", filters.search);
        if (filters.cropId) params.set("cropId", filters.cropId);
        const res  = await fetch(`/api/stock?${params}`);
        const json = await res.json();
        if (json.success) { setRows(json.data?.data ?? []); setTotal(json.data?.total ?? 0); }
      } catch { /* silent */ } finally { setInitialized(true); }
    });
  }, [page, filters]);

  useEffect(() => { fetchStock(); }, [fetchStock]);

  useEffect(() => {
    fetch("/api/crops").then((r) => r.json()).then((j) => { if (j.success) setCrops(j.data ?? []); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!canManage) return;
    fetch("/api/seeds?pageSize=200").then((r) => r.json()).then((j) => { if (j.success) setProducts(j.data?.data ?? []); }).catch(() => {});
  }, [canManage]);

  function handleFiltersChange(next: StockFiltersType) { setFilters(next); setPage(1); }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = !!(filters.search || filters.cropId);

  return (
    <div className="flex flex-col gap-4 h-full">
      <StockHeader total={total} canManage={canManage} onAdd={() => { setEditStock(null); setFormOpen(true); }} />
      <StockFilters filters={filters} crops={crops} onChange={handleFiltersChange} />

      <div className="flex-1 min-h-0">
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

      <div className="sticky bottom-0 bg-background border-t py-2.5">
        <StockPagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <StockFormDialog
        open={formOpen} onOpenChange={setFormOpen}
        stock={editStock} seedProducts={products} onSuccess={fetchStock}
      />
      <StockDeleteDialog
        open={deleteOpen} onOpenChange={setDeleteOpen}
        stock={deleteStock} onSuccess={fetchStock}
      />
    </div>
  );
}
