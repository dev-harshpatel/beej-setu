"use client";

import { CheckCircleIcon, PauseCircleIcon, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ADMIN_SETTABLE_STATUSES,
  type OrderStatusValue,
} from "@/constants/order-status.constants";
import type { OrderWithRelations } from "@/types/order.types";

interface OrderDrawerActionsProps {
  order: OrderWithRelations;
  readOnly: boolean;
  mode: "view" | "edit";
  // Quick actions
  actionPending: boolean;
  saveError: string | null;
  saving: boolean;
  onApprove: () => void;
  onHold: () => void;
  onCancel: () => void;
  // Status change
  pendingStatus: OrderStatusValue | "";
  statusSaving: boolean;
  onPendingStatusChange: (v: OrderStatusValue) => void;
  onStatusSave: () => void;
}

export function OrderDrawerActions({
  order,
  readOnly,
  mode,
  actionPending,
  saveError,
  saving,
  onApprove,
  onHold,
  onCancel,
  pendingStatus,
  statusSaving,
  onPendingStatusChange,
  onStatusSave,
}: OrderDrawerActionsProps) {
  if (readOnly) return null;

  const showQuickActions =
    (order.status === ORDER_STATUSES.PENDING || order.status === ORDER_STATUSES.HOLD) &&
    mode === "view";

  return (
    <>
      {showQuickActions && (
        <>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Actions</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="bg-success text-success-foreground hover:bg-success/90"
                disabled={actionPending}
                onClick={onApprove}
              >
                <CheckCircleIcon className="size-3.5" />
                Approve
              </Button>
              <Button
                size="sm" variant="outline"
                disabled={actionPending}
                onClick={onHold}
              >
                <PauseCircleIcon className="size-3.5" />
                Hold
              </Button>
              <Button
                size="sm" variant="outline"
                className="text-destructive hover:text-destructive"
                disabled={actionPending}
                onClick={onCancel}
              >
                <XCircleIcon className="size-3.5" />
                Cancel Order
              </Button>
            </div>
            {saveError && !actionPending && (
              <p className="text-sm text-destructive">{saveError}</p>
            )}
          </div>
          <Separator />
        </>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Change Status</h3>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={pendingStatus}
            onValueChange={(v) => onPendingStatusChange(v as OrderStatusValue)}
          >
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue
                placeholder={`Current: ${ORDER_STATUS_LABELS[order.status as OrderStatusValue] ?? order.status}`}
              />
            </SelectTrigger>
            <SelectContent>
              {ADMIN_SETTABLE_STATUSES.filter((s) => s !== order.status).map((s) => (
                <SelectItem key={s} value={s}>{ORDER_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!pendingStatus || statusSaving}
            onClick={onStatusSave}
          >
            <CheckCircleIcon className="size-3.5" />
            {statusSaving ? "Updating…" : "Update Status"}
          </Button>
        </div>
        {saveError && !saving && (
          <p className="text-sm text-destructive">{saveError}</p>
        )}
      </div>
      <Separator />
    </>
  );
}
