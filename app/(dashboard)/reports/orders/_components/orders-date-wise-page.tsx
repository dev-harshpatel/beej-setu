"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { OrdersDateWiseTable } from "./orders-date-wise-table";
import type { OrderWithRelations } from "@/types/order.types";

interface Props { staffId: string | null; }

interface ActiveFilters {
  staffId: string | null;
  dateFrom: string;
  dateTo: string;
}

export function groupByDate(orders: OrderWithRelations[]): Record<string, OrderWithRelations[]> {
  const groups: Record<string, OrderWithRelations[]> = {};
  for (const order of orders) {
    const date = order.created_at.split("T")[0];
    (groups[date] ??= []).push(order);
  }
  return groups;
}

export function OrdersDateWisePage({ staffId }: Props) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [activeFilters, setActiveFilters] = useState<ActiveFilters | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ["report-date-wise", activeFilters],
    queryFn: async () => {
      if (!activeFilters) return null;
      const params = new URLSearchParams({ pageSize: "500" });
      if (activeFilters.staffId)  params.set("staffId",  activeFilters.staffId);
      if (activeFilters.dateFrom) params.set("dateFrom", activeFilters.dateFrom);
      if (activeFilters.dateTo)   params.set("dateTo",   activeFilters.dateTo);
      const res  = await fetch(`/api/orders?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error("Failed to fetch orders");
      return json.data as { data: OrderWithRelations[]; total: number };
    },
    enabled: !!activeFilters,
  });

  const orders    = data?.data ?? [];
  const grouped   = groupByDate(orders);
  const hasReport = !!activeFilters;

  function handleGenerate() {
    setActiveFilters({ staffId, dateFrom, dateTo });
  }

  function handleClear() {
    setDateFrom(""); setDateTo(""); setActiveFilters(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-semibold">Date-wise Orders</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {staffId ? "Your orders grouped by date." : "All orders grouped by date."}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end rounded-lg border border-border p-4 bg-card">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">From</label>
          <DatePicker
            value={dateFrom}
            onChange={(v) => { setDateFrom(v); if (dateTo && v && v > dateTo) setDateTo(""); }}
            placeholder="Start date"
            className="w-40"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">To</label>
          <DatePicker
            value={dateTo}
            onChange={setDateTo}
            placeholder="End date"
            minDate={dateFrom || undefined}
            className="w-40"
          />
        </div>
        <div className="flex gap-2 items-end">
          <Button onClick={handleGenerate} disabled={isFetching}>
            {isFetching ? "Loading…" : "Generate Report"}
          </Button>
          {hasReport && (
            <Button variant="ghost" size="icon" onClick={handleClear} title="Clear">
              <XIcon className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {hasReport && (
        <OrdersDateWiseTable
          grouped={grouped}
          loading={isFetching}
          totalOrders={orders.length}
        />
      )}
    </div>
  );
}
