"use client";

import {
  CheckCircleIcon,
  ClipboardListIcon,
  PauseCircleIcon,
  PencilIcon,
  SendIcon,
  ShoppingBagIcon,
  XCircleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusBadge } from "./order-status-badge";
import {
  ORDER_STATUSES,
  CHALLAN_ELIGIBLE_STATUSES,
  TRANSPORT_UPDATE_ELIGIBLE_STATUSES,
  type OrderStatusValue,
} from "@/constants/order-status.constants";
import type { OrderWithRelations } from "@/types/order.types";

interface OrdersTableProps {
  orders: OrderWithRelations[];
  loading: boolean;
  isDispatchStaff?: boolean;
  onEdit: (order: OrderWithRelations) => void;
  onApprove: (order: OrderWithRelations) => void;
  onHold: (order: OrderWithRelations) => void;
  onCancel: (order: OrderWithRelations) => void;
  onCreateChallan: (order: OrderWithRelations) => void;
}

export function OrdersTable({
  orders,
  loading,
  isDispatchStaff = false,
  onEdit,
  onApprove,
  onHold,
  onCancel,
  onCreateChallan,
}: OrdersTableProps) {
  if (loading) {
    return (
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Dealer</TableHead>
              <TableHead className="hidden md:table-cell">Staff</TableHead>
              <TableHead className="hidden lg:table-cell">Center</TableHead>
              <TableHead className="hidden sm:table-cell">Date</TableHead>
              <TableHead className="hidden sm:table-cell">Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-8" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1.5">
                    <Skeleton className="h-7 w-16" />
                    <Skeleton className="h-7 w-14" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border py-16 text-muted-foreground">
        <ShoppingBagIcon className="size-8 opacity-40" />
        <p className="text-sm">No orders found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Dealer</TableHead>
            <TableHead className="hidden md:table-cell">Staff</TableHead>
            <TableHead className="hidden lg:table-cell">Center</TableHead>
            <TableHead className="hidden sm:table-cell">Date</TableHead>
            <TableHead className="hidden sm:table-cell">Items</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const status = order.status as OrderStatusValue;
            const isPending = status === ORDER_STATUSES.PENDING;
            const challanEligible = CHALLAN_ELIGIBLE_STATUSES.includes(status);
            const transportUpdateEligible = TRANSPORT_UPDATE_ELIGIBLE_STATUSES.includes(status);
            const dispatchChallanVisible =
              challanEligible ||
              transportUpdateEligible ||
              status === ORDER_STATUSES.TRANSPORT_DISPATCHED ||
              status === ORDER_STATUSES.SHIPPED;

            return (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs font-medium">
                  {order.order_number}
                </TableCell>
                <TableCell className="font-medium">
                  {order.dealer?.name ?? "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {order.staff?.name ?? "—"}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {order.dealer?.territory ?? "—"}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground whitespace-nowrap">
                  {new Date(order.created_at).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {order.items?.length ?? 0}
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={status} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Pending orders: 3 action buttons */}
                    {isPending && (
                      <>
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-success text-success-foreground hover:bg-success/90 border-0"
                          onClick={() => onApprove(order)}
                        >
                          <CheckCircleIcon className="size-3.5" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => onHold(order)}
                        >
                          <PauseCircleIcon className="size-3.5" />
                          Hold
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => onCancel(order)}
                        >
                          <XCircleIcon className="size-3.5" />
                          Cancel
                        </Button>
                      </>
                    )}

                    {/* Dispatch staff: single Challan button for all dispatch-visible statuses */}
                    {isDispatchStaff && dispatchChallanVisible && (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-accent text-accent-foreground hover:bg-accent/80 border-0"
                        onClick={() => onCreateChallan(order)}
                      >
                        <ClipboardListIcon className="size-3.5" />
                        Challan
                      </Button>
                    )}

                    {/* Admin: Challan button for approved/partially-approved */}
                    {!isDispatchStaff && challanEligible && (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-accent text-accent-foreground hover:bg-accent/80 border-0"
                        onClick={() => onCreateChallan(order)}
                      >
                        <ClipboardListIcon className="size-3.5" />
                        Challan
                      </Button>
                    )}

                    {/* Admin: Transport Dispatch button for godown-dispatched orders */}
                    {!isDispatchStaff && transportUpdateEligible && (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-purple-600 text-white hover:bg-purple-700 border-0"
                        onClick={() => onCreateChallan(order)}
                      >
                        <SendIcon className="size-3.5" />
                        Transport Dispatch
                      </Button>
                    )}

                    {/* Edit — hidden for dispatch staff */}
                    {!isDispatchStaff && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => onEdit(order)}
                      >
                        <PencilIcon className="size-3.5" />
                        Edit
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
