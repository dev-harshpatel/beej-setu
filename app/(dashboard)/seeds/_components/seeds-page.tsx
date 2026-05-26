"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePermissions } from "@/hooks";
import { PERMISSIONS } from "@/constants/roles.constants";
import { PAGINATION_DEFAULTS } from "@/constants/app.constants";
import { SeedsHeader } from "./seeds-header";
import { SeedsFilters, type SeedFilters } from "./seeds-filters";
import { SeedsTable } from "./seeds-table";
import { SeedsEmpty } from "./seeds-empty";
import { SeedsPagination } from "./seeds-pagination";
import { SeedDetailSheet } from "./seed-detail-sheet";
import type { SeedProductWithCropRow } from "@/lib/database/seeds.queries";
import type { CropRow } from "@/types/database.types";

const PAGE_SIZE = PAGINATION_DEFAULTS.PAGE_SIZE;

export function SeedsPage() {
  const [isPending, startTransition] = useTransition();
  const [initialized, setInitialized] = useState(false);
  const { hasPermission } = usePermissions();
  const canViewStock = hasPermission(PERMISSIONS.STOCK_MANAGE);
  const loading = !initialized || isPending;

  const [products, setProducts] = useState<SeedProductWithCropRow[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [filters, setFilters]   = useState<SeedFilters>({ search: "", cropId: "", variety: "" });
  const [crops, setCrops]       = useState<CropRow[]>([]);
  const [varieties, setVarieties] = useState<string[]>([]);
  const [selectedSeed, setSelectedSeed] = useState<SeedProductWithCropRow | null>(null);

  const fetchProducts = useCallback(() => {
    startTransition(async () => {
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
        if (filters.search)  params.set("search",  filters.search);
        if (filters.cropId)  params.set("cropId",  filters.cropId);
        if (filters.variety) params.set("variety", filters.variety);

        const res  = await fetch(`/api/seeds?${params}`);
        const json = await res.json();
        if (json.success) {
          setProducts(json.data?.data ?? []);
          setTotal(json.data?.total ?? 0);
        }
      } catch { /* silent */ } finally {
        setInitialized(true);
      }
    });
  }, [page, filters]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    fetch("/api/crops")
      .then((r) => r.json())
      .then((j) => { if (j.success) setCrops(j.data ?? []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!filters.cropId) { setVarieties([]); return; }
    fetch(`/api/seeds?cropId=${filters.cropId}&pageSize=200`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          const vs = [...new Set<string>((j.data?.data ?? []).map((p: SeedProductWithCropRow) => p.variety))]
            .sort();
          setVarieties(vs);
        }
      })
      .catch(() => {});
  }, [filters.cropId]);

  function handleFiltersChange(next: SeedFilters) {
    const cropChanged = next.cropId !== filters.cropId;
    setFilters(cropChanged ? { ...next, variety: "" } : next);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = !!(filters.search || filters.cropId || filters.variety);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-4 px-4 sm:px-5 pt-3 sm:pt-4 pb-3 shrink-0">
        <SeedsHeader total={total} />
        <SeedsFilters filters={filters} crops={crops} varieties={varieties} onChange={handleFiltersChange} />
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col px-4 sm:px-5">
        {!loading && products.length === 0 ? (
          <SeedsEmpty hasFilters={hasFilters} />
        ) : (
          <SeedsTable products={products} loading={loading} onRowClick={setSelectedSeed} canViewStock={canViewStock} />
        )}
      </div>

      <div className="shrink-0 border-t px-4 sm:px-5 py-2.5">
        <SeedsPagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <SeedDetailSheet
        seed={selectedSeed}
        open={!!selectedSeed}
        onClose={() => setSelectedSeed(null)}
        canViewStock={canViewStock}
      />
    </div>
  );
}
