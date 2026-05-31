"use client";

import { ChevronDownIcon, ChevronRightIcon, EyeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "../../../orders/_components/order-status-badge";
import type { OrderWithRelations } from "@/types/order.types";
import type { OrderStatusValue } from "@/constants/order-status.constants";

interface Props {
  date: string;
  orders: OrderWithRelations[];
  expanded: boolean;
  onToggle: () => void;
  onView: (order: OrderWithRelations) => void;
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function DateGroupRow({ date, orders, expanded, onToggle, onView }: Props) {
  return (
    <div>
      {/* Date header — clickable to expand/collapse */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {expanded
            ? <ChevronDownIcon className="size-4 text-muted-foreground shrink-0" />
            : <ChevronRightIcon className="size-4 text-muted-foreground shrink-0" />
          }
          <span className="text-sm font-semibold">{formatDate(date)}</span>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {orders.length} order{orders.length !== 1 ? "s" : ""}
        </span>
      </button>

      {/* Expanded order rows */}
      {expanded && (
        <div className="divide-y divide-border bg-background">
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between pl-10 pr-3 py-2.5 gap-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 min-w-0">
                <span className="font-mono text-xs font-semibold text-foreground shrink-0">
                  {order.order_number}
                </span>
                <span className="text-xs sm:text-sm text-muted-foreground truncate">
                  {order.dealer?.name ?? "—"}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <OrderStatusBadge status={order.status as OrderStatusValue} />
                <Button
                  variant="ghost"
                  size="icon"
                  title="View order details"
                  onClick={() => onView(order)}
                >
                  <EyeIcon className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
