"use client";

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
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusBadge } from "./order-status-badge";
import {
  ORDER_STATUSES,
  CHALLAN_ELIGIBLE_STATUSES,
  TRANSPORT_UPDATE_ELIGIBLE_STATUSES,
  type OrderStatusValue,
} from "@/constants/order-status.constants";
import { formatDateMedium } from "@/lib/utils";
import type { OrderWithRelations } from "@/types/order.types";

const STATUS_BORDER: Record<OrderStatusValue, string> = {
  PENDING:              "border-l-warning",
  APPROVED:             "border-l-success",
  PARTIALLY_APPROVED:   "border-l-orange-500",
  HOLD:                 "border-l-info",
  CANCELLED:            "border-l-destructive",
  GODOWN_DISPATCHED:    "border-l-blue-600",
  TRANSPORT_DISPATCHED: "border-l-purple-600",
  SHIPPED:              "border-l-accent-foreground",
};

interface OrderCardProps {
  order: OrderWithRelations;
  isDispatchStaff?: boolean;
  processingOrderId?: string | null;
  canDelete?: boolean;
  selected?: boolean;
  onToggle?: (checked: boolean) => void;
  onEdit: (order: OrderWithRelations) => void;
  onApprove: (order: OrderWithRelations) => void;
  onHold: (order: OrderWithRelations) => void;
  onCancel: (order: OrderWithRelations) => void;
  onCreateChallan: (order: OrderWithRelations) => void;
}

export function OrderCard({
  order,
  isDispatchStaff = false,
  processingOrderId,
  canDelete,
  selected = false,
  onToggle,
  onEdit,
  onApprove,
  onHold,
  onCancel,
  onCreateChallan,
}: OrderCardProps) {
  const status = order.status as OrderStatusValue;
  const isPending = status === ORDER_STATUSES.PENDING;
  const isProcessing = processingOrderId === order.id;
  const challanEligible = CHALLAN_ELIGIBLE_STATUSES.includes(status);
  const transportUpdateEligible = TRANSPORT_UPDATE_ELIGIBLE_STATUSES.includes(status);
  const dispatchChallanVisible =
    challanEligible ||
    transportUpdateEligible ||
    status === ORDER_STATUSES.TRANSPORT_DISPATCHED ||
    status === ORDER_STATUSES.SHIPPED;

  const borderClass = STATUS_BORDER[status] ?? "border-l-border";
  const itemCount = order.items?.length ?? 0;
  const date = formatDateMedium(order.created_at);

  return (
    <div className={`rounded-lg border border-border border-l-4 ${borderClass} bg-card p-3 flex flex-col gap-2`}>
      {/* Row 1: [checkbox] order# · date + status badge */}
      <div className="flex items-center justify-between gap-2">
        {canDelete && onToggle && (
          <span onClick={(e) => e.stopPropagation()}>
            <Checkbox checked={selected} onCheckedChange={onToggle} />
          </span>
        )}
        <span className="font-mono text-xs font-semibold text-foreground truncate flex-1">
          {order.order_number}
          <span className="font-sans font-normal text-muted-foreground"> · {date}</span>
        </span>
        <OrderStatusBadge status={status} />
      </div>

      {/* Row 2: dealer name + item count */}
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-foreground leading-snug truncate">
          {order.dealer?.name ?? "—"}
        </p>
        <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
          {itemCount} item{itemCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Row 3: staff · territory or center (only if present) */}
      {isDispatchStaff ? (
        order.center && (
          <p className="text-xs text-muted-foreground -mt-1">{order.center}</p>
        )
      ) : (
        (() => {
          const parts = [order.staff?.name, order.dealer?.territory].filter(Boolean);
          return parts.length > 0 ? (
            <p className="text-xs text-muted-foreground -mt-1">{parts.join(" · ")}</p>
          ) : null;
        })()
      )}

      {/* Actions */}
      {isPending ? (
        <div className="flex flex-col gap-1.5 pt-2 border-t border-border">
          <Button
            className="w-full h-9 text-sm bg-success text-success-foreground hover:bg-success/90 border-0"
            disabled={isProcessing}
            onClick={() => onApprove(order)}
          >
            <CheckCircleIcon className="size-4" />
            {isProcessing ? "Approving…" : "Approve"}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-8 text-xs"
              disabled={isProcessing}
              onClick={() => onHold(order)}
            >
              <PauseCircleIcon className="size-3.5" />
              Hold
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-8 text-xs text-destructive hover:text-destructive"
              disabled={isProcessing}
              onClick={() => onCancel(order)}
            >
              <XCircleIcon className="size-3.5" />
              Cancel
            </Button>
            {!isDispatchStaff && (
              <Button
                variant="outline"
                className="flex-1 h-8 text-xs"
                onClick={() => onEdit(order)}
              >
                <PencilIcon className="size-3.5" />
                Edit
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex gap-2 pt-1.5 border-t border-border">
          {isDispatchStaff && dispatchChallanVisible && (
            <Button
              className="flex-1 h-8 text-xs bg-accent text-accent-foreground hover:bg-accent/80 border-0"
              onClick={() => onCreateChallan(order)}
            >
              <ClipboardListIcon className="size-3.5" />
              Challan
            </Button>
          )}

          {!isDispatchStaff && challanEligible && (
            <Button
              className="flex-1 h-8 text-xs bg-accent text-accent-foreground hover:bg-accent/80 border-0"
              onClick={() => onCreateChallan(order)}
            >
              <ClipboardListIcon className="size-3.5" />
              Challan
            </Button>
          )}

          {!isDispatchStaff && transportUpdateEligible && (
            <Button
              className="flex-1 h-8 text-xs bg-purple-600 text-white hover:bg-purple-700 border-0"
              onClick={() => onCreateChallan(order)}
            >
              <SendIcon className="size-3.5" />
              Transport Dispatch
            </Button>
          )}

          {!isDispatchStaff && (
            <Button
              variant="outline"
              className="h-8 text-xs"
              onClick={() => onEdit(order)}
            >
              <PencilIcon className="size-3.5" />
              Edit
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="rounded-lg border border-border border-l-4 border-l-muted bg-card p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-10" />
      </div>
      <Skeleton className="h-3 w-28" />
      <div className="pt-1.5 border-t border-border">
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}
