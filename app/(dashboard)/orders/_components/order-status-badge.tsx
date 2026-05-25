import { Badge } from "@/components/ui/badge";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_BADGE_CLASSES,
  type OrderStatusValue,
} from "@/constants/order-status.constants";

interface OrderStatusBadgeProps {
  status: OrderStatusValue;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const label = ORDER_STATUS_LABELS[status] ?? status;
  const className = ORDER_STATUS_BADGE_CLASSES[status] ?? "bg-muted text-muted-foreground border-0";
  return <Badge className={className}>{label}</Badge>;
}
