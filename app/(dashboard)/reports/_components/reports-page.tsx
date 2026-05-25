"use client";

import { useEffect, useState, useTransition } from "react";
import { ReportsSummaryCards } from "./reports-summary-cards";
import { OrdersOverview } from "./orders-overview";
import { InventoryReport, type InventoryRow } from "./inventory-report";
import { TopSeeds, type TopSeedRow } from "./top-seeds";
import { TopDealers, type TopDealerRow } from "./top-dealers";

interface ReportsData {
  totalOrders: number;
  confirmedOrders: number;
  totalInventoryPackets: number;
  lowStockCount: number;
  criticalStockCount: number;
  activeDealers: number;
  ordersByStatus: { status: string; count: number }[];
  inventory: InventoryRow[];
  topSeeds: TopSeedRow[];
  topDealers: TopDealerRow[];
}

export function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [isPending, startTransition] = useTransition();
  const [initialized, setInitialized] = useState(false);
  const loading = !initialized || isPending;

  useEffect(() => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/reports");
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch { /* silent */ } finally {
        setInitialized(true);
      }
    });
  }, []);

  const d = data ?? {
    totalOrders: 0, confirmedOrders: 0, totalInventoryPackets: 0,
    lowStockCount: 0, criticalStockCount: 0, activeDealers: 0,
    ordersByStatus: [], inventory: [], topSeeds: [], topDealers: [],
  };

  return (
    <div className="flex flex-col gap-6">
      <ReportsSummaryCards
        totalOrders={d.totalOrders}
        confirmedOrders={d.confirmedOrders}
        totalInventoryPackets={d.totalInventoryPackets}
        lowStockCount={d.lowStockCount}
        criticalStockCount={d.criticalStockCount}
        activeDealers={d.activeDealers}
        loading={loading}
      />

      <OrdersOverview ordersByStatus={d.ordersByStatus} loading={loading} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <TopSeeds rows={d.topSeeds} loading={loading} />
        </div>
        <div className="lg:col-span-2">
          <TopDealers rows={d.topDealers} loading={loading} />
        </div>
      </div>

      <InventoryReport rows={d.inventory} loading={loading} />
    </div>
  );
}
