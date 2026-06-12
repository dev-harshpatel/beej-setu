import {
  TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface DealersTableSkeletonProps {
  isStaff: boolean;
  canEdit: boolean;
  canDelete: boolean;
  showCheckboxes: boolean;
}

export function DealersTableSkeleton({ isStaff, canEdit, canDelete, showCheckboxes }: DealersTableSkeletonProps) {
  return (
    <div className="overflow-auto rounded-lg border border-border h-full">
      <table className="w-full caption-bottom text-sm">
        <TableHeader className="sticky top-0 z-10 [&_th]:bg-card md:hidden">
          <TableRow>
            <TableHead>Dealer</TableHead>
            {canEdit && <TableHead className="w-16 text-right">Actions</TableHead>}
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
              {canEdit && <TableCell className="md:hidden" />}
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
