import { MapPinIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DealerStatusBadge } from "./dealer-status-badge";
import type { DealerStatusValue } from "@/constants/dealer-status.constants";
import type { DealerWithStaffRow } from "@/lib/database/dealers.queries";

const STATUS_DOT: Record<DealerStatusValue, string> = {
  ACTIVE:     "bg-success",
  SUSPENDED:  "bg-warning",
  TERMINATED: "bg-destructive",
};

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
      <div className="overflow-auto rounded-lg border border-border h-full">
        <table className="w-full caption-bottom text-sm">
          <TableHeader className="sticky top-0 z-10 [&_th]:bg-card md:hidden">
            <TableRow>
              <TableHead>Dealer</TableHead>
              {(canEdit || canDelete) && <TableHead className="w-16 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableHeader className="sticky top-0 z-10 [&_th]:bg-card hidden md:table-header-group">
            <TableRow>
              {showCheckboxes && <TableHead className="w-8" />}
              <TableHead>Dealer Name</TableHead>
              {!isStaff && <TableHead>Assigned Staff</TableHead>}
              <TableHead>Contact</TableHead>
              <TableHead className="hidden lg:table-cell">Territory</TableHead>
              <TableHead>Status</TableHead>
              {(canEdit || canDelete) && <TableHead className="w-20 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell className="md:hidden py-2"><Skeleton className="h-3.5 w-32" /></TableCell>
                {(canEdit || canDelete) && <TableCell className="md:hidden" />}
                {showCheckboxes && <TableCell className="hidden md:table-cell w-8" />}
                <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                {!isStaff && <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>}
                <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                {(canEdit || canDelete) && <TableCell className="hidden md:table-cell" />}
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>
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
            <TableHead>Contact</TableHead>
            <TableHead className="hidden lg:table-cell">Territory</TableHead>
            <TableHead>Status</TableHead>
            {(canEdit || canDelete) && <TableHead className="w-20 text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>

        <TableBody>
          {dealers.map((dealer) => {
            const dotClass  = STATUS_DOT[dealer.status as DealerStatusValue] ?? "bg-muted";
            const meta      = [dealer.contact, dealer.territory].filter(Boolean).join(" · ");
            const isChecked = selectedIds?.has(dealer.id) ?? false;

            return (
              <TableRow
                key={dealer.id}
                className={canEdit ? "cursor-pointer" : ""}
                onClick={() => canEdit && onEdit(dealer)}
              >
                {/* ── Mobile cell ── */}
                <TableCell className="md:hidden py-2.5">
                  <div className="flex items-center gap-2.5">
                    {showCheckboxes && (
                      <span onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={isChecked} onCheckedChange={(c) => toggleOne(dealer.id, c)} />
                      </span>
                    )}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`size-1.5 rounded-full shrink-0 ${dotClass}`} />
                      <div className="min-w-0">
                        <p className="font-medium text-sm leading-tight truncate">{dealer.name}</p>
                        {meta && <p className="text-xs text-muted-foreground mt-0.5 truncate">{meta}</p>}
                      </div>
                    </div>
                  </div>
                </TableCell>

                {/* ── Mobile actions cell ── */}
                {(canEdit || canDelete) && (
                  <TableCell className="md:hidden text-right py-2.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-0.5">
                      {canEdit && (
                        <Button variant="ghost" size="sm" className="size-7 p-0" onClick={() => onEdit(dealer)}>
                          <PencilIcon className="size-3.5" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="sm" className="size-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(dealer)}>
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}

                {/* ── Desktop checkbox cell ── */}
                {showCheckboxes && (
                  <TableCell className="hidden md:table-cell w-8 pl-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={isChecked} onCheckedChange={(c) => toggleOne(dealer.id, c)} />
                  </TableCell>
                )}

                {/* ── Desktop cells ── */}
                <TableCell className="hidden md:table-cell font-medium">
                  {dealer.name}
                  {dealer.territory && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 lg:hidden">
                      <MapPinIcon className="size-3" />{dealer.territory}
                    </span>
                  )}
                </TableCell>
                {!isStaff && (
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {dealer.staff?.name ?? <span className="italic opacity-50">Unassigned</span>}
                  </TableCell>
                )}
                <TableCell className="hidden md:table-cell text-sm tabular-nums">{dealer.contact}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {dealer.territory ?? "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <DealerStatusBadge status={dealer.status} />
                </TableCell>
                {(canEdit || canDelete) && (
                  <TableCell className="hidden md:table-cell text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <Button variant="ghost" size="sm" className="size-7 p-0" onClick={() => onEdit(dealer)}>
                          <PencilIcon className="size-3.5" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="sm" className="size-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(dealer)}>
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </table>
    </div>
  );
}
