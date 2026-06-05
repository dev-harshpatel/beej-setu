"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/hooks/use-auth";
import { PERMISSIONS, ROLES } from "@/constants/roles.constants";
import { PAGINATION_DEFAULTS } from "@/constants/app.constants";
import { TablePagination } from "@/components/shared/table-pagination";
import { DealersHeader } from "./dealers-header";
import { DealersFilters, type DealerFilters } from "./dealers-filters";
import { DealersTable } from "./dealers-table";
import { DealersEmpty } from "./dealers-empty";
import { DealerFormDialog } from "./dealer-form-dialog";
import { DealerDeleteDialog } from "./dealer-delete-dialog";
import { DealerUploadDialog } from "./dealer-upload-dialog";
import { QUERY_KEYS } from "@/hooks/use-realtime-invalidation";
import type { DealerWithStaffRow } from "@/lib/database/dealers.queries";
import type { ProfileRow } from "@/types/database.types";

const DEFAULT_PAGE_SIZE = PAGINATION_DEFAULTS.PAGE_SIZE;

export function DealersPage() {
  const { user }          = useAuth();
  const isStaff           = user?.role === ROLES.STAFF;
  const { hasPermission } = usePermissions();
  const canCreate         = hasPermission(PERMISSIONS.DEALERS_CREATE);
  const canEdit           = hasPermission(PERMISSIONS.DEALERS_EDIT);
  const canDelete         = hasPermission(PERMISSIONS.DEALERS_DELETE);

  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState<number>(DEFAULT_PAGE_SIZE);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters]     = useState<DealerFilters>({ search: "", status: "", territory: "" });

  const [formOpen, setFormOpen]         = useState(false);
  const [editDealer, setEditDealer]     = useState<DealerWithStaffRow | null>(null);
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [deleteDealer, setDeleteDealer] = useState<DealerWithStaffRow | null>(null);
  const [uploadOpen, setUploadOpen]     = useState(false);

  // Reset to page 1 on search change (instant, no debounce)
  useEffect(() => { setPage(1); }, [searchInput]);

  // ── Dealers list — fetch all, filter client-side ──────────
  // No search param: search is instant and zero round-trips.
  // Realtime invalidation automatically refetches when the dealers table changes.
  const { data: dealersData, isFetching: dealersFetching } = useQuery({
    queryKey: [
      ...QUERY_KEYS.DEALERS,
      { status: filters.status, territory: filters.territory },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", pageSize: "500" });
      if (filters.status)    params.set("status", filters.status);
      if (filters.territory) params.set("territory", filters.territory);
      const res  = await fetch(`/api/dealers?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error("Failed to fetch dealers");
      return json.data as { data: DealerWithStaffRow[]; total: number };
    },
    placeholderData: keepPreviousData,
  });

  const allDealers = useMemo(() => dealersData?.data ?? [], [dealersData]);
  const loading    = dealersFetching && !dealersData;

  // Client-side search filter (instant)
  const filteredDealers = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return allDealers;
    return allDealers.filter((d) =>
      d.name.toLowerCase().includes(q) ||
      d.contact.includes(q) ||
      d.territory?.toLowerCase().includes(q) ||
      d.staff?.name.toLowerCase().includes(q),
    );
  }, [allDealers, searchInput]);

  // Client-side pagination on filtered results
  const total      = filteredDealers.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const dealers    = useMemo(
    () => filteredDealers.slice((page - 1) * pageSize, page * pageSize),
    [filteredDealers, page, pageSize],
  );

  const territories = useMemo(
    () => [...new Set(allDealers.map((d) => d.territory).filter(Boolean) as string[])],
    [allDealers],
  );

  // ── Staff list (for form dropdowns) ──────────────────────
  const { data: staffListData } = useQuery({
    queryKey: ["staff-list"],
    queryFn: async () => {
      const res  = await fetch("/api/users?role=STAFF&pageSize=100");
      const json = await res.json();
      return (json.data?.data ?? []) as ProfileRow[];
    },
    enabled: canCreate || canEdit,
    staleTime: 5 * 60_000,
  });
  const staffList = staffListData ?? [];

  const hasFilters = !!(searchInput || filters.status || filters.territory);

  // ── Handlers ──────────────────────────────────────────────
  function handleFiltersChange(next: DealerFilters) {
    setFilters((prev) =>
      prev.status === next.status && prev.territory === next.territory ? prev : next,
    );
    if (next.search !== searchInput) setSearchInput(next.search);
    setPage(1);
  }

  function handleReset() {
    setSearchInput("");
    setFilters({ search: "", status: "", territory: "" });
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
  }

  function openAdd()                          { setEditDealer(null); setFormOpen(true); }
  function openEdit(d: DealerWithStaffRow)    { setEditDealer(d); setFormOpen(true); }
  function openDelete(d: DealerWithStaffRow)  { setDeleteDealer(d); setDeleteOpen(true); }

  return (
    <div className="flex flex-col h-full">

      {/* ── Static top: header + filters ──────────────────── */}
      <div className="flex flex-col gap-3 pb-4 shrink-0">
        <DealersHeader total={total} canCreate={canCreate} onAdd={openAdd} onUpload={() => setUploadOpen(true)} />
        <DealersFilters
          searchInput={searchInput}
          onSearchChange={setSearchInput}
          filters={filters}
          territories={territories}
          onChange={handleFiltersChange}
        />
      </div>

      {/* ── Scrollable middle: table or empty state ────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {!loading && dealers.length === 0 ? (
          <DealersEmpty hasFilters={hasFilters} canCreate={canCreate} onAdd={openAdd} onReset={hasFilters ? handleReset : undefined} />
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

      {/* ── Sticky bottom: pagination bar ─────────────────── */}
      {!loading && total > 0 && (
        <div className="shrink-0 border-t border-border bg-background py-3">
          <TablePagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        </div>
      )}

      {/* Dialogs */}
      <DealerUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSuccess={() => setUploadOpen(false)}
      />
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
