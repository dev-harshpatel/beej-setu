"use client";

import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { format } from "date-fns";
import { ReportsFilters, type ReportFilters } from "./reports-filters";
import { ReportsSummaryCards } from "./reports-summary-cards";
import { TerritoryBreakdownTable, StaffBreakdownTable } from "./reports-breakdown";
import { OrdersOverview } from "./orders-overview";
import { InventoryReport, type InventoryRow } from "./inventory-report";
import { TopSeeds, type TopSeedRow } from "./top-seeds";
import { TopDealers, type TopDealerRow } from "./top-dealers";
import type { ReportData } from "@/lib/database/reports.queries";
import type { ProfileRow } from "@/types/database.types";

// ── Query keys ────────────────────────────────────────────────────────────────
const REPORTS_KEY = ["reports"] as const;
const REPORTS_META_KEY = ["reports-meta"] as const;
const REPORTS_OVERVIEW_KEY = ["reports-overview"] as const;

// ── Empty state shapes ────────────────────────────────────────────────────────
const EMPTY_REPORT: ReportData = {
  summary: {
    totalOrders: 0, pending: 0, approved: 0, partiallyApproved: 0,
    hold: 0, cancelled: 0, godownDispatched: 0, transportDispatched: 0, shipped: 0,
  },
  byTerritory: [],
  byStaff: [],
};

interface ReportsMeta {
  territories: string[];
  staffList: Pick<ProfileRow, "id" | "name" | "territory">[];
}

const EMPTY_META: ReportsMeta = { territories: [], staffList: [] };

interface OverviewData {
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

const EMPTY_OVERVIEW: OverviewData = {
  totalOrders: 0, confirmedOrders: 0, totalInventoryPackets: 0,
  lowStockCount: 0, criticalStockCount: 0, activeDealers: 0,
  ordersByStatus: [], inventory: [], topSeeds: [], topDealers: [],
};

// ── Active filter label helper ────────────────────────────────────────────────
function buildActiveLabel(filters: ReportFilters, meta: ReportsMeta): string {
  const parts: string[] = [];

  if (filters.dateFrom || filters.dateTo) {
    const from = filters.dateFrom ? format(new Date(filters.dateFrom), "dd MMM yyyy") : "—";
    const to   = filters.dateTo   ? format(new Date(filters.dateTo),   "dd MMM yyyy") : "—";
    parts.push(`${from} → ${to}`);
  }
  if (filters.territory) parts.push(filters.territory);
  if (filters.staffId) {
    const staff = meta.staffList.find((s) => s.id === filters.staffId);
    if (staff) parts.push(staff.name);
  }

  return parts.length ? parts.join(" · ") : "All time, all territories, all staff";
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: "", dateTo: "", territory: "", staffId: "",
  });

  // ── Filter metadata (territories + staff list) — fetched once ────────────
  const { data: metaData } = useQuery({
    queryKey: REPORTS_META_KEY,
    queryFn: async () => {
      const res  = await fetch("/api/reports/meta");
      const json = await res.json();
      return (json.data ?? EMPTY_META) as ReportsMeta;
    },
    staleTime: 5 * 60_000,
  });
  const meta = metaData ?? EMPTY_META;

  // ── Report data — re-fetched whenever filters change ─────────────────────
  const { data: reportData, isFetching: reportFetching } = useQuery({
    queryKey: [...REPORTS_KEY, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.dateFrom)  params.set("dateFrom",  filters.dateFrom);
      if (filters.dateTo)    params.set("dateTo",    filters.dateTo);
      if (filters.territory) params.set("territory", filters.territory);
      if (filters.staffId)   params.set("staffId",   filters.staffId);
      const res  = await fetch(`/api/reports?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error("Failed to fetch report");
      return json.data as ReportData;
    },
    placeholderData: keepPreviousData,
  });

  // ── Overview data — fetched once (inventory, seeds, dealers) ─────────────
  const { data: overviewData, isFetching: overviewFetching } = useQuery({
    queryKey: REPORTS_OVERVIEW_KEY,
    queryFn: async () => {
      const res  = await fetch("/api/reports/overview");
      const json = await res.json();
      if (!json.success) throw new Error("Failed to fetch overview");
      return json.data as OverviewData;
    },
    staleTime: 5 * 60_000,
  });

  const report   = reportData ?? EMPTY_REPORT;
  const overview = overviewData ?? EMPTY_OVERVIEW;
  const loading  = reportFetching && !reportData;
  const overviewLoading = overviewFetching && !overviewData;

  // ── Cross-filter handlers: clicking a row in the breakdown tables ─────────
  function handleTerritoryClick(territory: string) {
    setFilters((prev) => ({ ...prev, territory }));
  }

  function handleStaffClick(staffId: string) {
    setFilters((prev) => ({ ...prev, staffId }));
  }

  const activeLabel = buildActiveLabel(filters, meta);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-semibold text-foreground">Order Reports</h2>
        <p className="text-xs text-muted-foreground">{activeLabel}</p>
      </div>

      {/* Filters */}
      <ReportsFilters
        filters={filters}
        territories={meta.territories}
        staffList={meta.staffList}
        onChange={(next) => setFilters(next)}
      />

      {/* Summary stat cards */}
      <ReportsSummaryCards summary={report.summary} loading={loading} />

      {/* Breakdown tables — cross-filter enabled */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <TerritoryBreakdownTable
          data={report.byTerritory}
          loading={loading}
          activeTerritory={filters.territory || undefined}
          onTerritoryClick={handleTerritoryClick}
        />
        <StaffBreakdownTable
          data={report.byStaff}
          loading={loading}
          activeStaffId={filters.staffId || undefined}
          onStaffClick={handleStaffClick}
        />
      </div>

      {/* Orders overview chart */}
      <OrdersOverview ordersByStatus={overview.ordersByStatus} loading={overviewLoading} />

      {/* Top seeds & top dealers */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <TopSeeds rows={overview.topSeeds} loading={overviewLoading} />
        </div>
        <div className="lg:col-span-2">
          <TopDealers rows={overview.topDealers} loading={overviewLoading} />
        </div>
      </div>

      {/* Inventory */}
      <InventoryReport rows={overview.inventory} loading={overviewLoading} />
    </div>
  );
}
