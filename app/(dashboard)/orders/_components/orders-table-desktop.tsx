import {
  CheckCircleIcon,
  ClipboardListIcon,
  PauseCircleIcon,
  PencilIcon,
  SendIcon,
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
import { OrderStatusBadge } from "./order-status-badge";
import {
  ORDER_STATUSES,
  CHALLAN_ELIGIBLE_STATUSES,
  TRANSPORT_UPDATE_ELIGIBLE_STATUSES,
  type OrderStatusValue,
} from "@/constants/order-status.constants";
import type { OrderWithRelations } from "@/types/order.types";

interface OrdersTableDesktopProps {
  orders: OrderWithRelations[];
  isDispatchStaff: boolean;
  processingOrderId?: string | null;
  onEdit: (order: OrderWithRelations) => void;
  onApprove: (order: OrderWithRelations) => void;
  onHold: (order: OrderWithRelations) => void;
  onCancel: (order: OrderWithRelations) => void;
  onCreateChallan: (order: OrderWithRelations) => void;
}

export function OrdersTableDesktop({
  orders,
  isDispatchStaff,
  processingOrderId,
  onEdit,
  onApprove,
  onHold,
  onCancel,
  onCreateChallan,
}: OrdersTableDesktopProps) {
  return (
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
          {orders.map((order) => {
            const status = order.status as OrderStatusValue;
            const isPending           = status === ORDER_STATUSES.PENDING;
            const isProcessing        = processingOrderId === order.id;
            const challanEligible     = CHALLAN_ELIGIBLE_STATUSES.includes(status);
            const transportEligible   = TRANSPORT_UPDATE_ELIGIBLE_STATUSES.includes(status);
            const dispatchChallanVisible =
              challanEligible ||
              transportEligible ||
              status === ORDER_STATUSES.TRANSPORT_DISPATCHED ||
              status === ORDER_STATUSES.SHIPPED;

            return (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs font-medium">
                  {order.order_number}
                </TableCell>
                <TableCell className="font-medium">{order.dealer?.name ?? "—"}</TableCell>

                {isDispatchStaff ? (
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {order.center ?? "—"}
                  </TableCell>
                ) : (
                  <>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {order.staff?.name ?? "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {order.dealer?.territory ?? "—"}
                    </TableCell>
                  </>
                )}

                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground whitespace-nowrap">
                  {new Date(order.created_at).toLocaleDateString("en-IN", {
                    day: "2-digit", month: "short", year: "numeric",
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
                    {isPending && (
                      <>
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-success text-success-foreground hover:bg-success/90 border-0"
                          disabled={isProcessing}
                          onClick={() => onApprove(order)}
                        >
                          <CheckCircleIcon className="size-3.5" />
                          {isProcessing ? "…" : "Approve"}
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          className="h-7 text-xs"
                          disabled={isProcessing}
                          onClick={() => onHold(order)}
                        >
                          <PauseCircleIcon className="size-3.5" />
                          Hold
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          disabled={isProcessing}
                          onClick={() => onCancel(order)}
                        >
                          <XCircleIcon className="size-3.5" />
                          Cancel
                        </Button>
                      </>
                    )}

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

                    {!isDispatchStaff && transportEligible && (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-purple-600 text-white hover:bg-purple-700 border-0"
                        onClick={() => onCreateChallan(order)}
                      >
                        <SendIcon className="size-3.5" />
                        Transport Dispatch
                      </Button>
                    )}

                    {!isDispatchStaff && (
                      <Button
                        size="sm" variant="outline"
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
