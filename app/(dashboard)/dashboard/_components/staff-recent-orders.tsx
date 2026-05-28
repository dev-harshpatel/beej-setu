import { ShoppingCartIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ORDER_STATUS_LABELS, ORDER_STATUS_BADGE_CLASSES, type OrderStatusValue } from "@/constants/order-status.constants";

export interface RecentOrderItem {
  id: string;
  dealer: string;
  date: string;
  itemCount: number;
  status: OrderStatusValue;
}

interface StaffRecentOrdersProps {
  orders: RecentOrderItem[];
  loading?: boolean;
}

export function StaffRecentOrders({ orders, loading = false }: StaffRecentOrdersProps) {
  if (loading) {
    return (
      <div className="flex flex-col divide-y divide-border">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3 py-3 px-1">
            <div className="flex flex-col gap-1.5 flex-1">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

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
              <span className="text-xs text-muted-foreground tabular-nums">
                {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
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
