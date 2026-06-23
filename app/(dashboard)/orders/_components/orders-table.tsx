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
  canDelete?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  onEdit: (order: OrderWithRelations) => void;
  onApprove: (order: OrderWithRelations) => void;
  onHold: (order: OrderWithRelations) => void;
  onCancel: (order: OrderWithRelations) => void;
  onCreateChallan: (order: OrderWithRelations) => void;
  onDelete?: (order: OrderWithRelations) => void;
  onReset?: () => void;
}

export function OrdersTable({
  orders,
  loading,
  isDispatchStaff = false,
  processingOrderId,
  canDelete,
  selectedIds,
  onSelectionChange,
  onEdit,
  onApprove,
  onHold,
  onCancel,
  onCreateChallan,
  onDelete,
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

  function toggleOne(id: string, checked: boolean) {
    if (!onSelectionChange) return;
    const next = new Set(selectedIds);
    if (checked) next.add(id); else next.delete(id);
    onSelectionChange(next);
  }

  const sharedProps = {
    isDispatchStaff,
    processingOrderId,
    onEdit,
    onApprove,
    onHold,
    onCancel,
    onCreateChallan,
    onDelete,
  };

  return (
    <>
      {/* Mobile: card list */}
      <div className="md:hidden flex flex-col gap-3">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            canDelete={canDelete}
            selected={selectedIds?.has(order.id) ?? false}
            onToggle={(checked) => toggleOne(order.id, checked)}
            {...sharedProps}
          />
        ))}
      </div>

      {/* Desktop: data table */}
      <div className="hidden md:flex flex-col flex-1 min-h-0">
        <OrdersTableDesktop
          orders={orders}
          canDelete={canDelete}
          selectedIds={selectedIds}
          onSelectionChange={onSelectionChange}
          {...sharedProps}
        />
      </div>
    </>
  );
}
