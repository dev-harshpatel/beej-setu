"use client";

import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/hooks/use-auth";
import { PERMISSIONS, ROLES } from "@/constants/roles.constants";
import { PAGINATION_DEFAULTS } from "@/constants/app.constants";
import { DealersHeader } from "./dealers-header";
import { DealersFilters, type DealerFilters } from "./dealers-filters";
import { DealersTable } from "./dealers-table";
import { DealersEmpty } from "./dealers-empty";
import { DealersPagination } from "./dealers-pagination";
import { DealerFormDialog } from "./dealer-form-dialog";
import { DealerDeleteDialog } from "./dealer-delete-dialog";
import { QUERY_KEYS } from "@/hooks/use-realtime-invalidation";
import type { DealerWithStaffRow } from "@/lib/database/dealers.queries";
import type { ProfileRow } from "@/types/database.types";

const PAGE_SIZE = PAGINATION_DEFAULTS.PAGE_SIZE;

export function DealersPage() {
  const { user } = useAuth();
  const isStaff = user?.role === ROLES.STAFF;
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission(PERMISSIONS.DEALERS_CREATE);
  const canEdit   = hasPermission(PERMISSIONS.DEALERS_EDIT);
  const canDelete = hasPermission(PERMISSIONS.DEALERS_DELETE);

  const [page, setPage]             = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters]       = useState<DealerFilters>({ search: "", status: "", territory: "" });
  const [territories, setTerritories] = useState<string[]>([]);

  const [formOpen, setFormOpen]     = useState(false);
  const [editDealer, setEditDealer] = useState<DealerWithStaffRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteDealer, setDeleteDealer] = useState<DealerWithStaffRow | null>(null);

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => {
      setFilters((prev) =>
        prev.search === searchInput ? prev : { ...prev, search: searchInput },
      );
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  // ── Dealers list ──────────────────────────────────────────
  // Realtime invalidation automatically refetches when the dealers table changes.
  const { data: dealersData, isFetching: dealersFetching } = useQuery({
    queryKey: [
      ...QUERY_KEYS.DEALERS,
      { page, pageSize: PAGE_SIZE, search: filters.search, status: filters.status, territory: filters.territory },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (filters.search)    params.set("search", filters.search);
      if (filters.status)    params.set("status", filters.status);
      if (filters.territory) params.set("territory", filters.territory);
      const res  = await fetch(`/api/dealers?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error("Failed to fetch dealers");
      return json.data as { data: DealerWithStaffRow[]; total: number };
    },
    placeholderData: keepPreviousData,
  });

  const dealers = dealersData?.data ?? [];
  const total   = dealersData?.total ?? 0;
  const loading = dealersFetching && !dealersData;

  // Accumulate territory options from fetched rows
  useEffect(() => {
    const incoming = dealers.map((d) => d.territory).filter(Boolean) as string[];
    if (!incoming.length) return;
    setTerritories((prev) => {
      const merged = [...new Set([...prev, ...incoming])];
      return merged.length === prev.length && merged.every((t) => prev.includes(t))
        ? prev
        : merged;
    });
  }, [dealers]);

  // ── Staff list (for form dropdowns) ──────────────────────
  const { data: staffListData } = useQuery({
    queryKey: ["staff-list"],
    queryFn: async () => {
      const res  = await fetch("/api/users?role=STAFF&pageSize=100");
      const json = await res.json();
      return (json.data?.data ?? []) as ProfileRow[];
    },
    enabled: canCreate || canEdit,
    staleTime: 5 * 60_000, // staff list changes rarely
  });
  const staffList = staffListData ?? [];

  // ── Handlers ──────────────────────────────────────────────
  function handleFiltersChange(next: DealerFilters) {
    setFilters((prev) =>
      prev.search === next.search && prev.status === next.status && prev.territory === next.territory
        ? prev : next,
    );
    if (next.search !== searchInput) setSearchInput(next.search);
    setPage(1);
  }

  function openAdd()                          { setEditDealer(null); setFormOpen(true); }
  function openEdit(d: DealerWithStaffRow)    { setEditDealer(d); setFormOpen(true); }
  function openDelete(d: DealerWithStaffRow)  { setDeleteDealer(d); setDeleteOpen(true); }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = !!(filters.search || filters.status || filters.territory);

  return (
    <div className="flex flex-col gap-4 h-full">
      <DealersHeader total={total} canCreate={canCreate} onAdd={openAdd} />
      <DealersFilters
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        filters={filters}
        territories={territories}
        onChange={handleFiltersChange}
      />

      <div className="flex-1 min-h-0">
        {!loading && dealers.length === 0 ? (
          <DealersEmpty hasFilters={hasFilters} canCreate={canCreate} onAdd={openAdd} />
        ) : (
          <DealersTable
            dealers={dealers}
            loading={loading}
            isStaff={isStaff}
            canEdit={canEdit}
            canDelete={canDelete}
            onEdit={openEdit}
            onDelete={openDelete}
          />
        )}
      </div>

      <div className="sticky bottom-0 bg-background border-t py-2.5">
        <DealersPagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* onSuccess is now a no-op — realtime invalidation handles the refetch */}
      <DealerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        dealer={editDealer}
        staffList={staffList}
        onSuccess={() => setFormOpen(false)}
      />
      <DealerDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        dealer={deleteDealer}
        onSuccess={() => { setDeleteOpen(false); setDeleteDealer(null); }}
      />
    </div>
  );
}
