import { ShoppingCartIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { OrderStatus } from "@/types/order.types";

export interface RecentOrderItem {
  id: string;
  dealer: string;
  date: string;
  amount: number;
  status: OrderStatus;
}

interface StaffRecentOrdersProps {
  orders: RecentOrderItem[];
}

const STATUS_BADGE: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  DRAFT:      { label: "Draft",      className: "bg-muted text-muted-foreground border-0" },
  PENDING:    { label: "Pending",    className: "bg-warning/15 text-warning border-0" },
  CONFIRMED:  { label: "Confirmed",  className: "bg-accent text-accent-foreground border-0" },
  PROCESSING: { label: "Processing", className: "bg-info/15 text-info border-0" },
  SHIPPED:    { label: "Dispatched", className: "bg-info/15 text-info border-0" },
  DELIVERED:  { label: "Delivered",  className: "bg-accent text-accent-foreground border-0" },
  CANCELLED:  { label: "Cancelled",  className: "bg-destructive/10 text-destructive border-0" },
};

export function StaffRecentOrders({ orders }: StaffRecentOrdersProps) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
        <ShoppingCartIcon className="size-8 opacity-40" />
        <p className="text-sm">No orders placed yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {orders.map((order) => {
        const badge = STATUS_BADGE[order.status];
        return (
          <div
            key={order.id}
            className="flex items-center justify-between gap-3 py-3 px-1"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                {order.dealer}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{order.date}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {formatCurrency(order.amount)}
              </span>
              <Badge className={badge.className}>{badge.label}</Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}
