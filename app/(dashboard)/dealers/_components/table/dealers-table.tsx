import { Checkbox } from "@/components/ui/checkbox";
import {
  TableBody, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DealerRow } from "./dealer-row";
import { DealersTableSkeleton } from "./dealers-table-skeleton";
import type { DealerWithStaffRow } from "@/lib/database/dealers.queries";

interface DealersTableProps {
  dealers: DealerWithStaffRow[];
  loading: boolean;
  isStaff?: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (dealer: DealerWithStaffRow) => void;
  onDelete: (dealer: DealerWithStaffRow) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

export function DealersTable({
  dealers, loading, isStaff = false, canEdit, canDelete,
  onEdit, onDelete, selectedIds, onSelectionChange,
}: DealersTableProps) {
  const showCheckboxes = canDelete && !!onSelectionChange;

  const allPageIds = dealers.map((d) => d.id);
  const allSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds?.has(id));
  const someSelected = allPageIds.some((id) => selectedIds?.has(id));

  function toggleAll(checked: boolean) {
    if (!onSelectionChange) return;
    const next = new Set(selectedIds);
    if (checked) allPageIds.forEach((id) => next.add(id));
    else         allPageIds.forEach((id) => next.delete(id));
    onSelectionChange(next);
  }

  function toggleOne(id: string, checked: boolean) {
    if (!onSelectionChange) return;
    const next = new Set(selectedIds);
    if (checked) next.add(id); else next.delete(id);
    onSelectionChange(next);
  }

  if (loading) {
    return (
      <DealersTableSkeleton
        isStaff={isStaff}
        canEdit={canEdit}
        canDelete={canDelete}
        showCheckboxes={showCheckboxes}
      />
    );
  }

  return (
    <div className="overflow-auto rounded-lg border border-border h-full">
      <table className="w-full caption-bottom text-sm">

        {/* ── Mobile header ── */}
        <TableHeader className="sticky top-0 z-10 [&_th]:bg-card md:hidden">
          <TableRow>
            <TableHead>
              <div className="flex items-center gap-2">
                {showCheckboxes && (
                  <span onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected && !allSelected}
                      onCheckedChange={toggleAll}
                    />
                  </span>
                )}
                Dealer
              </div>
            </TableHead>
            {(canEdit || canDelete) && <TableHead className="w-16 text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>

        {/* ── Desktop header ── */}
        <TableHeader className="sticky top-0 z-10 [&_th]:bg-card hidden md:table-header-group">
          <TableRow>
            {showCheckboxes && (
              <TableHead className="w-8 pl-3">
                <span onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onCheckedChange={toggleAll}
                  />
                </span>
              </TableHead>
            )}
            <TableHead>Dealer Name</TableHead>
            {!isStaff && <TableHead>Assigned Staff</TableHead>}
            <TableHead>Transport</TableHead>
            <TableHead className="hidden lg:table-cell">Center</TableHead>
            <TableHead className="hidden lg:table-cell">Territory</TableHead>
            <TableHead>Status</TableHead>
            {(canEdit || canDelete) && <TableHead className="w-20 text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>

        <TableBody>
          {dealers.map((dealer) => (
            <DealerRow
              key={dealer.id}
              dealer={dealer}
              isStaff={isStaff}
              canEdit={canEdit}
              canDelete={canDelete}
              showCheckboxes={showCheckboxes}
              checked={selectedIds?.has(dealer.id) ?? false}
              onToggle={toggleOne}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </TableBody>
      </table>
    </div>
  );
}
