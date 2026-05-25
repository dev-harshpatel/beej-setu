import { ShoppingCartIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_BADGE_CLASSES, type OrderStatusValue } from "@/constants/order-status.constants";

export interface RecentOrderItem {
  id: string;
  dealer: string;
  date: string;
  amount: number;
  status: OrderStatusValue;
}

interface StaffRecentOrdersProps {
  orders: RecentOrderItem[];
}

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
      {orders.map((order) => (
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
              <Badge className={ORDER_STATUS_BADGE_CLASSES[order.status]}>
                {ORDER_STATUS_LABELS[order.status]}
              </Badge>
            </div>
          </div>
      ))}
    </div>
  );
}
