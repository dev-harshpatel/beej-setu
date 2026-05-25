"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
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

  const [isPending, startTransition] = useTransition();
  const [initialized, setInitialized] = useState(false);
  const loading = !initialized || isPending;

  const [dealers, setDealers] = useState<DealerWithStaffRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<DealerFilters>({ search: "", status: "", territory: "" });
  const [territories, setTerritories] = useState<string[]>([]);
  const [staffList, setStaffList] = useState<ProfileRow[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editDealer, setEditDealer] = useState<DealerWithStaffRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteDealer, setDeleteDealer] = useState<DealerWithStaffRow | null>(null);

  // Debounce search input — only update filters.search (and thus fetchDealers) after 300ms idle
  useEffect(() => {
    const id = setTimeout(() => {
      setFilters((prev) =>
        prev.search === searchInput ? prev : { ...prev, search: searchInput }
      );
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const fetchDealers = useCallback(() => {
    startTransition(async () => {
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
        if (filters.search)    params.set("search", filters.search);
        if (filters.status)    params.set("status", filters.status);
        if (filters.territory) params.set("territory", filters.territory);

        const res  = await fetch(`/api/dealers?${params}`);
        const json = await res.json();
        if (json.success) {
          const rows: DealerWithStaffRow[] = json.data?.data ?? [];
          setDealers(rows);
          setTotal(json.data?.total ?? 0);
          const incoming = rows.map((d) => d.territory).filter(Boolean) as string[];
          if (incoming.length) {
            setTerritories((prev) => {
              const merged = [...new Set([...prev, ...incoming])];
              // only update state if the set actually changed
              if (merged.length === prev.length && merged.every((t) => prev.includes(t))) return prev;
              return merged;
            });
          }
        }
      } catch { /* silent */ } finally {
        setInitialized(true);
      }
    });
  }, [page, filters]);

  useEffect(() => {
    fetchDealers();
  }, [fetchDealers]);

  useEffect(() => {
    if (!canCreate && !canEdit) return;
    fetch("/api/users?role=STAFF&pageSize=100")
      .then((r) => r.json())
      .then((j) => { if (j.success) setStaffList(j.data?.data ?? []); })
      .catch(() => {});
  }, [canCreate, canEdit]);

  function handleFiltersChange(next: DealerFilters) {
    // preserve reference identity when values are identical — prevents useCallback dep churn
    setFilters((prev) =>
      prev.search === next.search && prev.status === next.status && prev.territory === next.territory
        ? prev
        : next
    );
    // keep the search input in sync if the caller explicitly cleared it (e.g. a reset)
    if (next.search !== searchInput) setSearchInput(next.search);
    setPage(1);
  }

  function openAdd() {
    setEditDealer(null);
    setFormOpen(true);
  }

  function openEdit(dealer: DealerWithStaffRow) {
    setEditDealer(dealer);
    setFormOpen(true);
  }

  function openDelete(dealer: DealerWithStaffRow) {
    setDeleteDealer(dealer);
    setDeleteOpen(true);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = !!(filters.search || filters.status || filters.territory);

  return (
    <div className="flex flex-col gap-4 pb-4">
      <DealersHeader total={total} canCreate={canCreate} onAdd={openAdd} />
      <DealersFilters
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        filters={filters}
        territories={territories}
        onChange={handleFiltersChange}
      />

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

      {totalPages > 1 && (
        <DealersPagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      <DealerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        dealer={editDealer}
        staffList={staffList}
        onSuccess={fetchDealers}
      />
      <DealerDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        dealer={deleteDealer}
        onSuccess={fetchDealers}
      />
    </div>
  );
}
