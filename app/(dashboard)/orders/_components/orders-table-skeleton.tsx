import { Skeleton } from "@/components/ui/skeleton";
import { OrderCardSkeleton } from "./order-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SKELETON_ROWS = 5;

interface OrdersTableSkeletonProps {
  isDispatchStaff?: boolean;
}

export function OrdersTableSkeleton({ isDispatchStaff = false }: OrdersTableSkeletonProps) {
  return (
    <>
      {/* Mobile skeleton */}
      <div className="md:hidden flex flex-col gap-3">
        {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
          <OrderCardSkeleton key={i} />
        ))}
      </div>

      {/* Desktop skeleton — mirrors real table columns exactly */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Dealer</TableHead>
              {isDispatchStaff ? (
                <TableHead className="hidden md:table-cell">Location</TableHead>
              ) : (
                <>
                  <TableHead className="hidden md:table-cell">Staff</TableHead>
                  <TableHead className="hidden lg:table-cell">Center</TableHead>
                </>
              )}
              <TableHead className="hidden sm:table-cell">Date</TableHead>
              <TableHead className="hidden sm:table-cell">Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                {isDispatchStaff ? (
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                ) : (
                  <>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                  </>
                )}
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-8" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1.5">
                    <Skeleton className="h-7 w-16 rounded-md" />
                    <Skeleton className="h-7 w-14 rounded-md" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
