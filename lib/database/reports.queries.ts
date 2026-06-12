import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { ORDER_STATUSES, type OrderStatusValue } from "@/constants/order-status.constants";

// ── Overview types (shape mirrors InventoryRow/TopSeedRow/TopDealerRow in components) ──
export interface OverviewInventoryItem {
  seedId: string;
  cropName: string;
  variety: string;
  packSize: string;
  packetsPerBag: number;
  totalBags: number;
  totalLoosePackets: number;
  totalPacketsEquiv: number;
}

export interface OverviewSeedDemandItem {
  seedId: string;
  cropName: string;
  variety: string;
  packSize: string;
  orderedBags: number;
  orderedPackets: number;
  totalPacketsEquiv: number;
  orderCount: number;
}

export interface OverviewDealerItem {
  dealerId: string;
  name: string;
  territory: string | null;
  orderCount: number;
  confirmedCount: number;
}

export interface OverviewResult {
  totalOrders: number;
  confirmedOrders: number;
  activeDealers: number;
  ordersByStatus: { status: string; count: number }[];
  topSeeds: OverviewSeedDemandItem[];
  topDealers: OverviewDealerItem[];
  totalInventoryPackets?: number;
  lowStockCount?: number;
  criticalStockCount?: number;
  inventory?: OverviewInventoryItem[];
}

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
  async getReport(db: SupabaseClient<Database>, orgId: string, params?: ReportParams): Promise<ReportData> {
    // Resolve territory filter to dealer IDs (territory is on the dealers table, not orders)
    let dealerIds: string[] | null = null;
    if (params?.territory) {
      const { data: dealerData, error: dealerError } = await db
        .from("dealers")
        .select("id")
        .eq("organization_id", orgId)
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
      `)
      .eq("organization_id", orgId);

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

  async getOverview(
    db: SupabaseClient<Database>,
    orgId: string,
    staffId: string | null,
  ): Promise<OverviewResult> {
    const ORDER_STATUS_LIST = [
      "PENDING", "APPROVED", "PARTIALLY_APPROVED", "HOLD",
      "CANCELLED", "GODOWN_DISPATCHED", "TRANSPORT_DISPATCHED", "SHIPPED",
    ] as const;
    const ACTIVE_STATUSES = [
      "PENDING", "APPROVED", "PARTIALLY_APPROVED",
      "GODOWN_DISPATCHED", "TRANSPORT_DISPATCHED", "SHIPPED",
    ] as const;

    const buildOrdersQuery = () => {
      const q = db.from("orders").select("*", { count: "exact", head: true }).eq("organization_id", orgId);
      return staffId ? q.eq("staff_id", staffId) : q;
    };

    const [statusCountResults, ordersWithItems, stockRows, dealerRows] = await Promise.all([
      Promise.all(ORDER_STATUS_LIST.map(async (status) => {
        const { count } = await buildOrdersQuery().eq("status", status);
        return { status, count: count ?? 0 };
      })),
      (() => {
        const q = db
          .from("orders")
          .select("id, status, dealer_id, dealer:dealers(id, name, territory), items:order_items(seed_id, quantity, unit, seed:seed_products(variety, pack_size, packets_per_bag, crop:crops(name)))")
          .eq("organization_id", orgId)
          .in("status", ACTIVE_STATUSES);
        return staffId ? q.eq("staff_id", staffId) : q;
      })(),
      staffId
        ? Promise.resolve({ data: [] })
        : db
            .from("seed_stock")
            .select("seed_id, bag_stock, packet_stock, seed:seed_products!inner(variety, pack_size, packets_per_bag, crop:crops!inner(name))")
            .eq("organization_id", orgId),
      (() => {
        const q = db.from("orders").select("dealer_id, status, dealer:dealers(id, name, territory)").eq("organization_id", orgId);
        return staffId ? q.eq("staff_id", staffId) : q;
      })(),
    ]);

    // Inventory aggregation (admin only)
    type StockSeed = { variety: string; pack_size: string; packets_per_bag: number; crop: { name: string } };
    type StockRow = { seed_id: string; bag_stock: number; packet_stock: number; seed: StockSeed };
    const invMap = new Map<string, OverviewInventoryItem>();
    for (const row of (stockRows.data ?? []) as StockRow[]) {
      const existing = invMap.get(row.seed_id);
      if (existing) {
        existing.totalBags += row.bag_stock;
        existing.totalLoosePackets += row.packet_stock;
        existing.totalPacketsEquiv = existing.totalBags * existing.packetsPerBag + existing.totalLoosePackets;
      } else {
        const ppb = row.seed?.packets_per_bag ?? 1;
        invMap.set(row.seed_id, {
          seedId: row.seed_id,
          cropName: row.seed?.crop?.name ?? "Unknown",
          variety: row.seed?.variety ?? "Unknown",
          packSize: row.seed?.pack_size ?? "—",
          packetsPerBag: ppb,
          totalBags: row.bag_stock,
          totalLoosePackets: row.packet_stock,
          totalPacketsEquiv: row.bag_stock * ppb + row.packet_stock,
        });
      }
    }
    const inventory = [...invMap.values()].sort((a, b) => b.totalPacketsEquiv - a.totalPacketsEquiv);

    // Seed demand aggregation
    type ItemSeed = { variety: string; pack_size: string; packets_per_bag: number; crop: { name: string } };
    type OrderItem = { seed_id: string; quantity: number; unit: string; seed: ItemSeed };
    type OrderRow = { id: string; dealer_id: string; items: OrderItem[] };
    const seedDemand = new Map<string, OverviewSeedDemandItem>();
    for (const order of (ordersWithItems.data ?? []) as unknown as OrderRow[]) {
      for (const item of order.items ?? []) {
        const packs = item.seed?.packets_per_bag ?? 1;
        const isBag = item.unit === "Bag" || item.unit === "Box";
        const equiv = isBag ? item.quantity * packs : item.quantity;
        const existing = seedDemand.get(item.seed_id);
        if (existing) {
          if (isBag) existing.orderedBags += item.quantity;
          else existing.orderedPackets += item.quantity;
          existing.totalPacketsEquiv += equiv;
          existing.orderCount += 1;
        } else {
          seedDemand.set(item.seed_id, {
            seedId: item.seed_id,
            cropName: item.seed?.crop?.name ?? "Unknown",
            variety: item.seed?.variety ?? "Unknown",
            packSize: item.seed?.pack_size ?? "—",
            orderedBags: isBag ? item.quantity : 0,
            orderedPackets: isBag ? 0 : item.quantity,
            totalPacketsEquiv: equiv,
            orderCount: 1,
          });
        }
      }
    }
    const topSeeds = [...seedDemand.values()]
      .sort((a, b) => b.totalPacketsEquiv - a.totalPacketsEquiv)
      .slice(0, 10);

    // Top dealers aggregation
    type DealerRef = { id: string; name: string; territory: string | null };
    type DealerRow = { dealer_id: string; status: string; dealer: DealerRef };
    const CONFIRMED = ["APPROVED", "GODOWN_DISPATCHED", "TRANSPORT_DISPATCHED", "SHIPPED"];
    const dealerMap = new Map<string, OverviewDealerItem>();
    for (const row of (dealerRows.data ?? []) as unknown as DealerRow[]) {
      const id = row.dealer_id;
      const existing = dealerMap.get(id);
      if (existing) {
        existing.orderCount += 1;
        if (CONFIRMED.includes(row.status)) existing.confirmedCount += 1;
      } else {
        dealerMap.set(id, {
          dealerId: id,
          name: row.dealer?.name ?? "Unknown",
          territory: row.dealer?.territory ?? null,
          orderCount: 1,
          confirmedCount: CONFIRMED.includes(row.status) ? 1 : 0,
        });
      }
    }
    const topDealers = [...dealerMap.values()]
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 10);

    const totalOrders    = statusCountResults.reduce((s, r) => s + r.count, 0);
    const confirmedOrders = statusCountResults.find((s) => s.status === "APPROVED")?.count ?? 0;
    const activeDealers  = dealerMap.size;

    const result: OverviewResult = {
      totalOrders, confirmedOrders, activeDealers,
      ordersByStatus: statusCountResults,
      topSeeds, topDealers,
    };

    if (staffId === null) {
      const totalInventoryPackets = inventory.reduce((s, i) => s + i.totalPacketsEquiv, 0);
      result.totalInventoryPackets = totalInventoryPackets;
      result.lowStockCount      = inventory.filter((i) => i.totalPacketsEquiv < 20).length;
      result.criticalStockCount = inventory.filter((i) => i.totalPacketsEquiv < 5).length;
      result.inventory          = inventory;
    }

    return result;
  },

  async getTerritories(db: SupabaseClient<Database>, orgId: string): Promise<string[]> {
    const { data, error } = await db
      .from("dealers")
      .select("territory")
      .eq("organization_id", orgId)
      .not("territory", "is", null);
    if (error) throw error;
    return [...new Set((data ?? []).map((d) => d.territory).filter(Boolean) as string[])].sort();
  },
};
