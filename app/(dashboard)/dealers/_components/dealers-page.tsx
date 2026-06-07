"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Trash2Icon } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/hooks/use-auth";
import { PERMISSIONS, ROLES } from "@/constants/roles.constants";
import { PAGINATION_DEFAULTS } from "@/constants/app.constants";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/shared/table-pagination";
import { DealersHeader } from "./dealers-header";
import { DealersFilters, type DealerFilters } from "./dealers-filters";
import { DealersTable } from "./dealers-table";
import { DealersEmpty } from "./dealers-empty";
import { DealerFormDialog } from "./dealer-form-dialog";
import { DealerDeleteDialog } from "./dealer-delete-dialog";
import { DealerBulkDeleteDialog } from "./dealer-bulk-delete-dialog";
import { DealerUploadDialog } from "./dealer-upload-dialog";
import { QUERY_KEYS } from "@/hooks/use-realtime-invalidation";
import type { DealerWithStaffRow } from "@/lib/database/dealers.queries";
import type { ProfileRow } from "@/types/database.types";

const DEFAULT_PAGE_SIZE = PAGINATION_DEFAULTS.PAGE_SIZE;

export function DealersPage() {
  const queryClient       = useQueryClient();
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

  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Reset to page 1 on search change
  useEffect(() => { setPage(1); }, [searchInput]);
  // Clear selection when filters change
  useEffect(() => { setSelectedIds(new Set()); }, [filters, searchInput]);

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

  const filteredDealers = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return allDealers;
    return allDealers.filter((d) =>
      d.name.toLowerCase().includes(q) ||
      d.contact?.includes(q) ||
      d.territory?.toLowerCase().includes(q) ||
      d.staff?.name.toLowerCase().includes(q),
    );
  }, [allDealers, searchInput]);

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

  function invalidateDealers() {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DEALERS });
  }

  function openAdd()                          { setEditDealer(null); setFormOpen(true); }
  function openEdit(d: DealerWithStaffRow)    { setEditDealer(d); setFormOpen(true); }
  function openDelete(d: DealerWithStaffRow)  { setDeleteDealer(d); setDeleteOpen(true); }

  const selectedCount = selectedIds.size;

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

      {/* ── Bulk selection action bar ─────────────────────── */}
      {canDelete && selectedCount > 0 && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 mb-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm shrink-0">
          <span className="font-medium text-destructive">
            {selectedCount} dealer{selectedCount !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost" size="sm" className="h-7 text-xs"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
            <Button
              variant="destructive" size="sm" className="h-7 text-xs"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2Icon className="size-3.5" />
              Delete {selectedCount}
            </Button>
          </div>
        </div>
      )}

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
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
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
        onSuccess={() => { invalidateDealers(); setUploadOpen(false); }}
      />
      <DealerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        dealer={editDealer}
        staffList={staffList}
        onSuccess={() => { invalidateDealers(); setFormOpen(false); }}
      />
      <DealerDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        dealer={deleteDealer}
        onSuccess={() => { invalidateDealers(); setDeleteOpen(false); setDeleteDealer(null); }}
      />
      <DealerBulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        count={selectedCount}
        ids={[...selectedIds]}
        onSuccess={() => { invalidateDealers(); setSelectedIds(new Set()); setBulkDeleteOpen(false); }}
      />
    </div>
  );
}
