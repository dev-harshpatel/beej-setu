import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { ORDER_STATUSES, type OrderStatusValue } from "@/constants/order-status.constants";

export interface ReportParams {
  dateFrom?: string;
  dateTo?: string;
  territory?: string;
  staffId?: string;
}

export interface ReportSummary {
  totalOrders: number;
  pending: number;
  approved: number;
  partiallyApproved: number;
  hold: number;
  cancelled: number;
  godownDispatched: number;
  transportDispatched: number;
  shipped: number;
}

export interface TerritoryBreakdown {
  territory: string;
  total: number;
  pending: number;
  approved: number;
  cancelled: number;
  shipped: number;
}

export interface StaffBreakdown {
  staffId: string;
  staffName: string;
  territory: string | null;
  total: number;
  pending: number;
  approved: number;
  cancelled: number;
  shipped: number;
}

export interface ReportData {
  summary: ReportSummary;
  byTerritory: TerritoryBreakdown[];
  byStaff: StaffBreakdown[];
}

const EMPTY_SUMMARY: ReportSummary = {
  totalOrders: 0, pending: 0, approved: 0, partiallyApproved: 0,
  hold: 0, cancelled: 0, godownDispatched: 0, transportDispatched: 0, shipped: 0,
};

type RawOrderRow = {
  id: string;
  status: string;
  staff_id: string | null;
  dealer: { territory: string | null } | null;
  staff: { id: string; name: string; territory: string | null } | null;
};

function incrementSummary(summary: ReportSummary, status: OrderStatusValue) {
  summary.totalOrders++;
  switch (status) {
    case ORDER_STATUSES.PENDING:              summary.pending++;              break;
    case ORDER_STATUSES.APPROVED:             summary.approved++;             break;
    case ORDER_STATUSES.PARTIALLY_APPROVED:   summary.partiallyApproved++;    break;
    case ORDER_STATUSES.HOLD:                 summary.hold++;                 break;
    case ORDER_STATUSES.CANCELLED:            summary.cancelled++;            break;
    case ORDER_STATUSES.GODOWN_DISPATCHED:    summary.godownDispatched++;     break;
    case ORDER_STATUSES.TRANSPORT_DISPATCHED: summary.transportDispatched++;  break;
    case ORDER_STATUSES.SHIPPED:              summary.shipped++;              break;
  }
}

function isApproved(status: OrderStatusValue) {
  return status === ORDER_STATUSES.APPROVED || status === ORDER_STATUSES.PARTIALLY_APPROVED;
}

export const reportsQueries = {
  async getReport(db: SupabaseClient<Database>, params?: ReportParams): Promise<ReportData> {
    // Resolve territory filter to dealer IDs (territory is on the dealers table, not orders)
    let dealerIds: string[] | null = null;
    if (params?.territory) {
      const { data: dealerData, error: dealerError } = await db
        .from("dealers")
        .select("id")
        .eq("territory", params.territory);
      if (dealerError) throw dealerError;
      dealerIds = (dealerData ?? []).map((d) => d.id);
      if (dealerIds.length === 0) return { summary: { ...EMPTY_SUMMARY }, byTerritory: [], byStaff: [] };
    }

    let query = db
      .from("orders")
      .select(`
        id,
        status,
        staff_id,
        dealer:dealers(territory),
        staff:profiles(id, name, territory)
      `);

    if (params?.dateFrom) query = query.gte("created_at", params.dateFrom);
    if (params?.dateTo) query = query.lte("created_at", params.dateTo + "T23:59:59.999Z");
    if (params?.staffId) query = query.eq("staff_id", params.staffId);
    if (dealerIds) query = query.in("dealer_id", dealerIds);

    const { data, error } = await query;
    if (error) throw error;

    const orders = (data ?? []) as unknown as RawOrderRow[];
    const summary: ReportSummary = { ...EMPTY_SUMMARY };
    const territoryMap = new Map<string, TerritoryBreakdown>();
    const staffMap = new Map<string, StaffBreakdown>();

    for (const order of orders) {
      const status = order.status as OrderStatusValue;
      const territory = order.dealer?.territory ?? "Unassigned";
      const staff = order.staff;

      incrementSummary(summary, status);

      // Territory breakdown
      if (!territoryMap.has(territory)) {
        territoryMap.set(territory, { territory, total: 0, pending: 0, approved: 0, cancelled: 0, shipped: 0 });
      }
      const t = territoryMap.get(territory)!;
      t.total++;
      if (status === ORDER_STATUSES.PENDING)   t.pending++;
      if (isApproved(status))                  t.approved++;
      if (status === ORDER_STATUSES.CANCELLED) t.cancelled++;
      if (status === ORDER_STATUSES.SHIPPED)   t.shipped++;

      // Staff breakdown
      if (staff) {
        if (!staffMap.has(staff.id)) {
          staffMap.set(staff.id, {
            staffId: staff.id, staffName: staff.name, territory: staff.territory,
            total: 0, pending: 0, approved: 0, cancelled: 0, shipped: 0,
          });
        }
        const s = staffMap.get(staff.id)!;
        s.total++;
        if (status === ORDER_STATUSES.PENDING)   s.pending++;
        if (isApproved(status))                  s.approved++;
        if (status === ORDER_STATUSES.CANCELLED) s.cancelled++;
        if (status === ORDER_STATUSES.SHIPPED)   s.shipped++;
      }
    }

    return {
      summary,
      byTerritory: [...territoryMap.values()].sort((a, b) => b.total - a.total),
      byStaff: [...staffMap.values()].sort((a, b) => b.total - a.total),
    };
  },

  async getTerritories(db: SupabaseClient<Database>): Promise<string[]> {
    const { data, error } = await db
      .from("dealers")
      .select("territory")
      .not("territory", "is", null);
    if (error) throw error;
    return [...new Set((data ?? []).map((d) => d.territory).filter(Boolean) as string[])].sort();
  },
};
