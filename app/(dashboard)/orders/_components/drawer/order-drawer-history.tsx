import { ClockIcon, UserIcon } from "lucide-react";
import { formatDateTimeMedium } from "@/lib/utils";
import type { OrderWithRelations } from "@/types/order.types";

export function OrderDrawerHistory({ order }: { order: OrderWithRelations }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">History</h3>
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent">
            <UserIcon className="size-3 text-accent-foreground" />
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium">Order Created</p>
            <p className="text-xs text-muted-foreground">
              by {order.staff?.name ?? "Unknown"} ·{" "}
              {formatDateTimeMedium(order.created_at)}
            </p>
          </div>
        </div>

        {order.updated_at !== order.created_at && (
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
              <ClockIcon className="size-3 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium">Last Modified</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTimeMedium(order.updated_at)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
