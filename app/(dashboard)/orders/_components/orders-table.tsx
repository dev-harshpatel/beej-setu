"use client";

import { ShoppingBagIcon } from "lucide-react";
import { OrderCard } from "./order-card";
import { OrdersTableDesktop } from "./orders-table-desktop";
import { OrdersTableSkeleton } from "./orders-table-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import type { OrderWithRelations } from "@/types/order.types";

interface OrdersTableProps {
  orders: OrderWithRelations[];
  loading: boolean;
  isDispatchStaff?: boolean;
  processingOrderId?: string | null;
  onEdit: (order: OrderWithRelations) => void;
  onApprove: (order: OrderWithRelations) => void;
  onHold: (order: OrderWithRelations) => void;
  onCancel: (order: OrderWithRelations) => void;
  onCreateChallan: (order: OrderWithRelations) => void;
  onReset?: () => void;
}

export function OrdersTable({
  orders,
  loading,
  isDispatchStaff = false,
  processingOrderId,
  onEdit,
  onApprove,
  onHold,
  onCancel,
  onCreateChallan,
  onReset,
}: OrdersTableProps) {
  if (loading) {
    return <OrdersTableSkeleton isDispatchStaff={isDispatchStaff} />;
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBagIcon}
        title="No orders found"
        description="Try adjusting your filters or search term."
        action={onReset ? { label: "Reset Filters", onClick: onReset } : undefined}
      />
    );
  }

  const sharedProps = {
    isDispatchStaff,
    processingOrderId,
    onEdit,
    onApprove,
    onHold,
    onCancel,
    onCreateChallan,
  };

  return (
    <>
      {/* Mobile: card list */}
      <div className="md:hidden flex flex-col gap-3">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} {...sharedProps} />
        ))}
      </div>

      {/* Desktop: data table */}
      <OrdersTableDesktop orders={orders} {...sharedProps} />
    </>
  );
}
