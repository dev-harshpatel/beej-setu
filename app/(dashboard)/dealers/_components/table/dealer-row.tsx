import { MapPinIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import { DealerStatusBadge } from "../dealer-status-badge";
import { STATUS_DOT } from "../../_lib/dealers.config";
import type { DealerStatusValue } from "@/constants/dealer-status.constants";
import type { DealerWithStaffRow } from "@/lib/database/dealers.queries";

interface DealerRowProps {
  dealer: DealerWithStaffRow;
  isStaff: boolean;
  canEdit: boolean;
  canDelete: boolean;
  showCheckboxes: boolean;
  checked: boolean;
  onToggle: (id: string, checked: boolean) => void;
  onEdit: (dealer: DealerWithStaffRow) => void;
  onDelete: (dealer: DealerWithStaffRow) => void;
}

export function DealerRow({
  dealer, isStaff, canEdit, canDelete, showCheckboxes,
  checked, onToggle, onEdit, onDelete,
}: DealerRowProps) {
  const dotClass = STATUS_DOT[dealer.status as DealerStatusValue] ?? "bg-muted";
  const meta     = [dealer.contact, dealer.territory].filter(Boolean).join(" · ");

  return (
    <TableRow
      className={canEdit ? "cursor-pointer" : ""}
      onClick={() => canEdit && onEdit(dealer)}
    >
      {/* ── Mobile cell ── */}
      <TableCell className="md:hidden py-2.5">
        <div className="flex items-center gap-2.5">
          {showCheckboxes && (
            <span onClick={(e) => e.stopPropagation()}>
              <Checkbox checked={checked} onCheckedChange={(c) => onToggle(dealer.id, c)} />
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

      {/* ── Mobile actions cell — edit only; delete via checkbox + bulk bar ── */}
      {canEdit && (
        <TableCell className="md:hidden text-right py-2.5" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" className="size-7 p-0" onClick={() => onEdit(dealer)}>
            <PencilIcon className="size-3.5" />
          </Button>
        </TableCell>
      )}

      {/* ── Desktop checkbox cell ── */}
      {showCheckboxes && (
        <TableCell className="hidden md:table-cell w-8 pl-3" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={checked} onCheckedChange={(c) => onToggle(dealer.id, c)} />
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
      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
        {dealer.default_transport ?? <span className="italic opacity-50">—</span>}
      </TableCell>
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
}
