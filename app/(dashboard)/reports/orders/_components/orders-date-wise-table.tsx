"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { OrderDetailDrawer } from "../../../orders/_components/order-detail-drawer";
import { DateGroupRow } from "./date-group-row";
import type { OrderWithRelations } from "@/types/order.types";

interface Props {
  grouped: Record<string, OrderWithRelations[]>;
  loading: boolean;
  totalOrders: number;
}

export function OrdersDateWiseTable({ grouped, loading, totalOrders }: Props) {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<OrderWithRelations | null>(null);
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  function toggleDate(date: string) {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  function handleView(order: OrderWithRelations) {
    setSelectedOrder(order);
    setDrawerOpen(true);
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-border py-10 text-center text-sm text-muted-foreground">
        Loading orders…
      </div>
    );
  }

  if (sortedDates.length === 0) {
    return (
      <div className="rounded-lg border border-border py-10 text-center text-sm text-muted-foreground">
        No orders found for the selected period.
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold">
          {sortedDates.length} date{sortedDates.length !== 1 ? "s" : ""}&nbsp;·&nbsp;
          {totalOrders} order{totalOrders !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
        {sortedDates.map((date) => (
          <DateGroupRow
            key={date}
            date={date}
            orders={grouped[date]}
            expanded={expandedDates.has(date)}
            onToggle={() => toggleDate(date)}
            onView={handleView}
          />
        ))}
      </div>

      <OrderDetailDrawer
        order={selectedOrder}
        open={drawerOpen}
        readOnly
        onClose={() => setDrawerOpen(false)}
        onStatusChange={async () => {}}
        onUpdate={async () => {}}
        onCreateChallan={() => {}}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ["report-date-wise"] })}
      />
    </>
  );
}
