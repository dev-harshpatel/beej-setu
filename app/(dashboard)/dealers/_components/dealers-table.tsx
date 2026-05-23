import { PencilIcon, Trash2Icon, MapPinIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DealerStatusBadge } from "./dealer-status-badge";
import type { DealerWithStaffRow } from "@/lib/database/dealers.queries";

interface DealersTableProps {
  dealers: DealerWithStaffRow[];
  loading: boolean;
  isStaff?: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (dealer: DealerWithStaffRow) => void;
  onDelete: (dealer: DealerWithStaffRow) => void;
}

export function DealersTable({ dealers, loading, isStaff = false, canEdit, canDelete, onEdit, onDelete }: DealersTableProps) {
  const headerRow = (
    <TableHeader className="sticky top-0 z-10 [&_th]:bg-card">
      <TableRow>
        <TableHead>Dealer Name</TableHead>
        {!isStaff && <TableHead className="hidden sm:table-cell">Assigned Staff</TableHead>}
        <TableHead>Contact</TableHead>
        <TableHead className="hidden md:table-cell">Territory</TableHead>
        <TableHead>Status</TableHead>
        {(canEdit || canDelete) && <TableHead className="w-20 text-right">Actions</TableHead>}
      </TableRow>
    </TableHeader>
  );

  if (loading) {
    return (
      <div className="overflow-auto rounded-lg border border-border max-h-[420px] sm:max-h-[520px] lg:max-h-[620px]">
        <table className="w-full caption-bottom text-sm">
          {headerRow}
          <TableBody>
            {Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                {!isStaff && <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>}
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                {(canEdit || canDelete) && <TableCell />}
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border border-border max-h-[420px] sm:max-h-[520px] lg:max-h-[620px]">
      <table className="w-full caption-bottom text-sm">
        {headerRow}
        <TableBody>
          {dealers.map((dealer) => (
            <TableRow key={dealer.id}>
              <TableCell className="font-medium">
                {dealer.name}
                {dealer.territory && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 sm:hidden">
                    <MapPinIcon className="size-3" />{dealer.territory}
                  </span>
                )}
              </TableCell>
              {!isStaff && (
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {dealer.staff?.name ?? <span className="italic opacity-50">Unassigned</span>}
                </TableCell>
              )}
              <TableCell className="text-sm tabular-nums">{dealer.contact}</TableCell>
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                {dealer.territory ?? "—"}
              </TableCell>
              <TableCell>
                <DealerStatusBadge status={dealer.status} />
              </TableCell>
              {(canEdit || canDelete) && (
                <TableCell className="text-right">
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
          ))}
        </TableBody>
      </table>
    </div>
  );
}
