import {
  CheckCircleIcon,
  ClipboardListIcon,
  PauseCircleIcon,
  PencilIcon,
  SendIcon,
  XCircleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  canDelete?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  onEdit: (order: OrderWithRelations) => void;
  onApprove: (order: OrderWithRelations) => void;
  onHold: (order: OrderWithRelations) => void;
  onCancel: (order: OrderWithRelations) => void;
  onCreateChallan: (order: OrderWithRelations) => void;
}

const th = "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground";
const td = "p-2 align-middle whitespace-nowrap";
const tr = "border-b transition-colors hover:bg-muted/50";

export function OrdersTableDesktop({
  orders, isDispatchStaff, processingOrderId,
  canDelete, selectedIds, onSelectionChange,
  onEdit, onApprove, onHold, onCancel, onCreateChallan,
}: OrdersTableDesktopProps) {
  const showCheckboxes = canDelete && !!onSelectionChange;

  const allPageIds = orders.map((o) => o.id);
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

  return (
    <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-border">
      <table className="w-full caption-bottom text-sm">
        <thead className="sticky top-0 z-10 bg-background [&_tr]:border-b">
          <tr className="border-b">
            {showCheckboxes && (
              <th className={`${th} w-8 pl-3`}>
                <span onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onCheckedChange={toggleAll}
                  />
                </span>
              </th>
            )}
            <th className={th}>Order ID</th>
            <th className={th}>Dealer</th>
            {isDispatchStaff ? (
              <th className={`${th} hidden md:table-cell`}>Location</th>
            ) : (
              <>
                <th className={`${th} hidden md:table-cell`}>Staff</th>
                <th className={`${th} hidden lg:table-cell`}>Center</th>
              </>
            )}
            <th className={`${th} hidden sm:table-cell`}>Date</th>
            <th className={`${th} hidden sm:table-cell`}>Items</th>
            <th className={th}>Status</th>
            <th className={`${th} text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
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
            const isChecked = selectedIds?.has(order.id) ?? false;

            return (
              <tr key={order.id} className={tr}>
                {showCheckboxes && (
                  <td className={`${td} w-8 pl-3`} onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={isChecked} onCheckedChange={(c) => toggleOne(order.id, c)} />
                  </td>
                )}
                <td className={`${td} font-mono text-xs font-medium`}>{order.order_number}</td>
                <td className={`${td} font-medium`}>{order.dealer?.name ?? "—"}</td>

                {isDispatchStaff ? (
                  <td className={`${td} hidden md:table-cell text-sm text-muted-foreground`}>
                    {order.center ?? "—"}
                  </td>
                ) : (
                  <>
                    <td className={`${td} hidden md:table-cell text-sm text-muted-foreground`}>
                      {order.staff?.name ?? "—"}
                    </td>
                    <td className={`${td} hidden lg:table-cell text-sm text-muted-foreground`}>
                      {order.dealer?.territory ?? "—"}
                    </td>
                  </>
                )}

                <td className={`${td} hidden sm:table-cell text-sm text-muted-foreground`}>
                  {new Date(order.created_at).toLocaleDateString("en-IN", {
                    day: "2-digit", month: "short", year: "numeric",
                  })}
                </td>
                <td className={`${td} hidden sm:table-cell text-sm text-muted-foreground`}>
                  {order.items?.length ?? 0}
                </td>
                <td className={td}>
                  <OrderStatusBadge status={status} />
                </td>

                <td className={td}>
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
                          size="sm" variant="outline" className="h-7 text-xs"
                          disabled={isProcessing} onClick={() => onHold(order)}
                        >
                          <PauseCircleIcon className="size-3.5" />Hold
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          disabled={isProcessing} onClick={() => onCancel(order)}
                        >
                          <XCircleIcon className="size-3.5" />Cancel
                        </Button>
                      </>
                    )}

                    {isDispatchStaff && dispatchChallanVisible && (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-accent text-accent-foreground hover:bg-accent/80 border-0"
                        onClick={() => onCreateChallan(order)}
                      >
                        <ClipboardListIcon className="size-3.5" />Challan
                      </Button>
                    )}

                    {!isDispatchStaff && challanEligible && (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-accent text-accent-foreground hover:bg-accent/80 border-0"
                        onClick={() => onCreateChallan(order)}
                      >
                        <ClipboardListIcon className="size-3.5" />Challan
                      </Button>
                    )}

                    {!isDispatchStaff && transportEligible && (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-purple-600 text-white hover:bg-purple-700 border-0"
                        onClick={() => onCreateChallan(order)}
                      >
                        <SendIcon className="size-3.5" />Transport Dispatch
                      </Button>
                    )}

                    {!isDispatchStaff && (
                      <Button
                        size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => onEdit(order)}
                      >
                        <PencilIcon className="size-3.5" />Edit
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
