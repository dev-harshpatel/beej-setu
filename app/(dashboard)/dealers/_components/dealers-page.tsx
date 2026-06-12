"use client";

import { useMemo, useState } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/hooks/use-auth";
import { PERMISSIONS, ROLES } from "@/constants/roles.constants";
import { PAGINATION_DEFAULTS } from "@/constants/app.constants";
import { TablePagination } from "@/components/shared/table-pagination";
import { BulkActionBar } from "@/components/shared/bulk-action-bar";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { DealersHeader } from "./dealers-header";
import { DealersFilters, type DealerFilters } from "./dealers-filters";
import { DealersTable } from "./table/dealers-table";
import { DealersEmpty } from "./dealers-empty";
import { DealerFormDialog } from "./dialogs/dealer-form-dialog";
import { DealerUploadDialog } from "./dialogs/dealer-upload-dialog";
import { useDealersData } from "../_lib/use-dealers-data";
import { dealersService } from "@/services/dealers.service";
import { getApiErrorMessage } from "@/lib/api-client";
import type { DealerWithStaffRow } from "@/lib/database/dealers.queries";

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

  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const { allDealers, loading, staffList, invalidate } = useDealersData({
    status: filters.status,
    territory: filters.territory,
    staffListEnabled: canCreate || canEdit,
  });

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

  const hasFilters = !!(searchInput || filters.status || filters.territory);

  // Search/filter changes reset page + selection in the handlers (not effects)
  function handleSearchChange(value: string) {
    setSearchInput(value);
    setPage(1);
    setSelectedIds(new Set());
  }

  function handleFiltersChange(next: DealerFilters) {
    setFilters((prev) =>
      prev.status === next.status && prev.territory === next.territory ? prev : next,
    );
    if (next.search !== searchInput) setSearchInput(next.search);
    setPage(1);
    setSelectedIds(new Set());
  }

  function handleReset() {
    setSearchInput("");
    setFilters({ search: "", status: "", territory: "" });
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
    setSelectedIds(new Set());
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
          onSearchChange={handleSearchChange}
          filters={filters}
          territories={territories}
          onChange={handleFiltersChange}
        />
      </div>

      {/* ── Bulk selection action bar ─────────────────────── */}
      {canDelete && selectedCount > 0 && (
        <BulkActionBar
          count={selectedCount}
          entity="dealer"
          onClear={() => setSelectedIds(new Set())}
          onDelete={() => setBulkDeleteOpen(true)}
        />
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
        onSuccess={() => { invalidate(); setUploadOpen(false); }}
      />
      <DealerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        dealer={editDealer}
        staffList={staffList}
        onSuccess={() => { invalidate(); setFormOpen(false); }}
      />
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={(o) => { setDeleteOpen(o); if (!o) setDeleteDealer(null); }}
        title="Delete Dealer"
        description={
          <>Are you sure you want to delete <strong>{deleteDealer?.name}</strong>? This action cannot be undone.</>
        }
        onConfirm={async () => {
          try {
            await dealersService.remove(deleteDealer!.id);
          } catch (err: unknown) {
            throw new Error(getApiErrorMessage(err, "Failed to delete dealer"));
          }
          invalidate();
        }}
      />
      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selectedCount} Dealer${selectedCount !== 1 ? "s" : ""}`}
        description={
          <>Are you sure you want to delete <strong>{selectedCount} dealer{selectedCount !== 1 ? "s" : ""}</strong>? This action cannot be undone.</>
        }
        confirmLabel={`Delete ${selectedCount}`}
        onConfirm={async () => {
          try {
            await dealersService.bulkDelete([...selectedIds]);
          } catch (err: unknown) {
            throw new Error(getApiErrorMessage(err, "Failed to delete dealers"));
          }
          invalidate();
          setSelectedIds(new Set());
        }}
      />
    </div>
  );
}
