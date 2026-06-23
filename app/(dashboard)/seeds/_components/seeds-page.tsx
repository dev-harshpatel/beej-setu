"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { usePermissions } from "@/hooks";
import { PERMISSIONS } from "@/constants/roles.constants";
import { PAGINATION_DEFAULTS } from "@/constants/app.constants";
import { SeedsHeader } from "./seeds-header";
import { SeedsFilters, type SeedFilters } from "./seeds-filters";
import { SeedsTable } from "./seeds-table";
import { SeedsEmpty } from "./seeds-empty";
import { SeedsPagination } from "./seeds-pagination";
import { SeedDetailSheet } from "./seed-detail-sheet";
import { SeedFormDialog } from "./seed-form-dialog";
import { SeedDeleteDialog } from "./seed-delete-dialog";
import type { SeedProductWithCropRow } from "@/lib/database/seeds.queries";
import type { CropRow } from "@/types/database.types";

const PAGE_SIZE = PAGINATION_DEFAULTS.PAGE_SIZE;

export function SeedsPage() {
  const { hasPermission } = usePermissions();
  const canViewStock = hasPermission(PERMISSIONS.STOCK_MANAGE);
  const canCreate    = hasPermission(PERMISSIONS.SEEDS_CREATE);
  const canEdit      = hasPermission(PERMISSIONS.SEEDS_EDIT);
  const canDelete    = hasPermission(PERMISSIONS.SEEDS_DELETE);

  const queryClient = useQueryClient();

  const [page, setPage]     = useState(1);
  const [filters, setFilters] = useState<SeedFilters>({ search: "", cropId: "", variety: "" });
  const [selectedSeed, setSelectedSeed] = useState<SeedProductWithCropRow | null>(null);

  // Form dialog state
  const [formOpen,    setFormOpen]    = useState(false);
  const [editTarget,  setEditTarget]  = useState<SeedProductWithCropRow | null>(null);

  // Delete dialog state
  const [deleteOpen,   setDeleteOpen]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SeedProductWithCropRow | null>(null);

  // All seed products (server-side cropId/variety filter, client-side text search)
  const { data: allProducts = [], isFetching: productsFetching } = useQuery<SeedProductWithCropRow[]>({
    queryKey: ["seed-products", { cropId: filters.cropId, variety: filters.variety }],
    queryFn: async () => {
      const params = new URLSearchParams({ pageSize: "500" });
      if (filters.cropId)  params.set("cropId",  filters.cropId);
      if (filters.variety) params.set("variety", filters.variety);
      const res  = await fetch(`/api/seeds?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error("Failed to fetch seeds");
      return (json.data?.data ?? []) as SeedProductWithCropRow[];
    },
    placeholderData: keepPreviousData,
  });

  const { data: crops = [] } = useQuery<CropRow[]>({
    queryKey: ["crops"],
    queryFn: async () => {
      const res  = await fetch("/api/crops");
      const json = await res.json();
      return (json.data ?? []) as CropRow[];
    },
    staleTime: 10 * 60_000,
  });

  // Variety options for the current crop (disabled when no cropId)
  const { data: varieties = [] } = useQuery<string[]>({
    queryKey: ["seed-varieties", filters.cropId],
    queryFn: async () => {
      const res  = await fetch(`/api/seeds?cropId=${filters.cropId}&pageSize=200`);
      const json = await res.json();
      if (!json.success) return [];
      return [
        ...new Set<string>(
          (json.data?.data ?? []).map((p: SeedProductWithCropRow) => p.variety),
        ),
      ].sort();
    },
    enabled: !!filters.cropId,
    staleTime: 5 * 60_000,
  });

  function handleFiltersChange(next: SeedFilters) {
    const cropChanged = next.cropId !== filters.cropId;
    setFilters(cropChanged ? { ...next, variety: "" } : next);
    setPage(1);
  }

  function handleAdd() {
    setEditTarget(null);
    setFormOpen(true);
  }

  function handleEdit(seed: SeedProductWithCropRow) {
    setEditTarget(seed);
    setFormOpen(true);
  }

  function handleDeleteClick(seed: SeedProductWithCropRow) {
    setDeleteTarget(seed);
    setDeleteOpen(true);
  }

  function invalidateSeeds() {
    queryClient.invalidateQueries({ queryKey: ["seed-products"] });
    queryClient.invalidateQueries({ queryKey: ["seed-varieties"] });
    queryClient.invalidateQueries({ queryKey: ["crops"] });
  }

  // Client-side text search (instant, no round-trips)
  const filteredProducts = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q) return allProducts;
    return allProducts.filter((p) =>
      p.variety.toLowerCase().includes(q) ||
      p.pack_size.toLowerCase().includes(q) ||
      p.crop?.name.toLowerCase().includes(q),
    );
  }, [allProducts, filters.search]);

  // Client-side pagination
  const total      = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const products   = useMemo(
    () => filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredProducts, page],
  );

  const loading    = productsFetching && allProducts.length === 0;
  const hasFilters = !!(filters.search || filters.cropId || filters.variety);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-4 px-4 sm:px-5 pt-3 sm:pt-4 pb-3 shrink-0">
        <SeedsHeader
          total={total}
          canCreate={canCreate}
          search={filters.search}
          onSearchChange={(v) => handleFiltersChange({ ...filters, search: v })}
          onAdd={handleAdd}
        />
        <SeedsFilters filters={filters} crops={crops} varieties={varieties} onChange={handleFiltersChange} />
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col px-4 sm:px-5">
        {!loading && products.length === 0 ? (
          <SeedsEmpty hasFilters={hasFilters} />
        ) : (
          <SeedsTable
            products={products}
            loading={loading}
            canViewStock={canViewStock}
            canEdit={canEdit}
            canDelete={canDelete}
            onRowClick={setSelectedSeed}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
          />
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
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={(seed) => { setSelectedSeed(null); handleEdit(seed); }}
        onDelete={(seed) => { setSelectedSeed(null); handleDeleteClick(seed); }}
      />

      <SeedFormDialog
        key={editTarget?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        seed={editTarget}
        crops={crops}
        onSuccess={invalidateSeeds}
      />

      <SeedDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        seed={deleteTarget}
        onSuccess={invalidateSeeds}
      />
    </div>
  );
}
