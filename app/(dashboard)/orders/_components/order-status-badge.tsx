import { Badge } from "@/components/ui/badge";
import type { OrderRow } from "@/types/database.types";

type OrderStatus = OrderRow["status"];

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  DRAFT:      { label: "Draft",      className: "bg-muted text-muted-foreground border-0" },
  PENDING:    { label: "Pending",    className: "bg-warning/10 text-warning border-0" },
  CONFIRMED:  { label: "Confirmed",  className: "bg-info/10 text-info border-0" },
  PROCESSING: { label: "Processing", className: "bg-warning/20 text-warning border-0" },
  SHIPPED:    { label: "Dispatched", className: "bg-accent text-accent-foreground border-0" },
  DELIVERED:  { label: "Delivered",  className: "bg-success/10 text-success border-0" },
  CANCELLED:  { label: "Cancelled",  className: "bg-destructive/15 text-destructive border-0" },
};

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return <Badge className={config.className}>{config.label}</Badge>;
}
