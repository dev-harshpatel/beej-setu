"use client";

import { CheckCircleIcon, ClockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OrderWithRelations } from "@/types/order.types";

type OrderItem = OrderWithRelations["items"][number];

interface OrderBackorderPanelProps {
  backorderItems: OrderItem[];
  canEdit: boolean;
  readOnly: boolean;
  fulfilling: boolean;
  saveError: string | null;
  onFulfill: () => void;
}

export function OrderBackorderPanel({
  backorderItems,
  canEdit,
  readOnly,
  fulfilling,
  saveError,
  onFulfill,
}: OrderBackorderPanelProps) {
  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30">
      <div className="flex items-center gap-2 border-b border-orange-200 dark:border-orange-900 px-3 py-2">
        <ClockIcon className="size-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
        <span className="text-xs font-semibold text-orange-800 dark:text-orange-300">
          Pending Backorder
        </span>
      </div>

      <div className="flex flex-col divide-y divide-orange-100 dark:divide-orange-900/60">
        {backorderItems.map((item) => {
          const requested = item.requested_quantity ?? item.quantity;
          const remaining = requested - item.quantity;
          return (
            <div key={item.id} className="grid grid-cols-4 items-center gap-2 px-3 py-2.5 text-xs">
              <div className="col-span-1 min-w-0">
                <p className="font-medium truncate">{item.seed?.crops?.name ?? "—"}</p>
                {item.seed?.variety && (
                  <p className="text-muted-foreground truncate">{item.seed.variety}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-muted-foreground leading-tight">Requested</p>
                <p className="font-semibold tabular-nums">{requested} {item.unit}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground leading-tight">Supplied</p>
                <p className="font-semibold tabular-nums">{item.quantity} {item.unit}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground leading-tight">Remaining</p>
                <p className="font-semibold tabular-nums text-orange-600 dark:text-orange-400">
                  {remaining} {item.unit}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {canEdit && !readOnly && (
        <div className="border-t border-orange-200 dark:border-orange-900 px-3 py-2.5 flex flex-col gap-1.5">
          {saveError && fulfilling && (
            <p className="text-xs text-destructive">{saveError}</p>
          )}
          <div className="flex justify-end">
            <Button
              size="sm"
              className="bg-success text-success-foreground hover:bg-success/90"
              disabled={fulfilling}
              onClick={onFulfill}
            >
              <CheckCircleIcon className="size-3.5" />
              {fulfilling ? "Fulfilling…" : "Fulfill Remaining"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
