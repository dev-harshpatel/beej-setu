import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, StockMovementRow } from "@/types/database.types";

export type StockMovementEntry = StockMovementRow & {
  running_balance_packets: number;
  running_balance_bags: number;
  running_balance_pkt_rem: number;
  movement_by_profile: { name: string; role: string } | null;
  approved_by_profile: { name: string } | null;
  order: { order_number: string; dealer: { name: string } | null } | null;
};

export type BatchSummary = {
  total_in_packets: number;
  total_dispatched_packets: number;
  total_adj_in_packets: number;
  total_adj_out_packets: number;
  distinct_dealers_count: number;
  orders_count: number;
  first_movement_date: string | null;
  last_movement_date: string | null;
};

export type BatchWithStatus = {
  seed_id: string;
  batch_number: string;
  bag_stock: number;
  packet_stock: number;
  packets_per_bag: number;
  variety: string;
  pack_size: string;
  crop_name: string;
  first_movement_date: string | null;
  last_movement_date: string | null;
  batch_status: "ACTIVE" | "LOW" | "DEPLETED";
};

export type ReconciliationResult = {
  ledger_packets: number;
  actual_packets: number;
  is_reconciled: boolean;
  discrepancy: number;
};

function computeBatchStatus(bag_stock: number, packet_stock: number): BatchWithStatus["batch_status"] {
  if (bag_stock > 0) return "ACTIVE";
  if (packet_stock > 0) return "LOW";
  return "DEPLETED";
}

function computeSummary(movements: StockMovementEntry[]): BatchSummary {
  let total_in_packets = 0;
  let total_dispatched_packets = 0;
  let total_adj_in_packets = 0;
  let total_adj_out_packets = 0;
  const dealerNames = new Set<string>();
  const orderIds = new Set<string>();
  let first_movement_date: string | null = null;
  let last_movement_date: string | null = null;

  for (const m of movements) {
    if (m.movement_type === "ADD") total_in_packets += m.quantity_packets;
    else if (m.movement_type === "DISPATCH") total_dispatched_packets += m.quantity_packets;
    else if (m.movement_type === "ADJUSTMENT_IN") total_adj_in_packets += m.quantity_packets;
    else if (m.movement_type === "ADJUSTMENT_OUT") total_adj_out_packets += m.quantity_packets;

    if (m.order_id) orderIds.add(m.order_id);
    if (m.order?.dealer?.name) dealerNames.add(m.order.dealer.name);

    if (!first_movement_date || m.movement_date < first_movement_date) first_movement_date = m.movement_date;
    if (!last_movement_date || m.movement_date > last_movement_date) last_movement_date = m.movement_date;
  }

  return {
    total_in_packets,
    total_dispatched_packets,
    total_adj_in_packets,
    total_adj_out_packets,
    distinct_dealers_count: dealerNames.size,
    orders_count: orderIds.size,
    first_movement_date,
    last_movement_date,
  };
}

export const stockMovementsQueries = {
  async getBatches(
    db: SupabaseClient<Database>,
    filters: {
      cropId?: string;
      variety?: string;
      packSize?: string;
      batchNumber?: string;
    }
  ): Promise<BatchWithStatus[]> {
    let query = db
      .from("seed_stock")
      .select(
        "seed_id, batch_number, bag_stock, packet_stock, created_at, seed_product:seed_products!inner(variety, pack_size, packets_per_bag, crop:crops!inner(name))"
      );

    if (filters.cropId) {
      query = query.eq("seed_products.crop_id", filters.cropId);
    }
    if (filters.variety) {
      query = query.eq("seed_products.variety", filters.variety);
    }
    if (filters.packSize) {
      query = query.eq("seed_products.pack_size", filters.packSize);
    }
    if (filters.batchNumber) {
      query = query.ilike("batch_number", `%${filters.batchNumber}%`);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;

    const rows = (data ?? []) as Array<{
      seed_id: string;
      batch_number: string;
      bag_stock: number;
      packet_stock: number;
      seed_product: {
        variety: string;
        pack_size: string;
        packets_per_bag: number;
        crop: { name: string };
      };
    }>;

    // Fetch first/last movement dates in a single query
    const seedBatchPairs = rows.map((r) => `(seed_id.eq.${r.seed_id},batch_number.eq.${r.batch_number})`);
    let movementDates: Record<string, { first: string | null; last: string | null }> = {};

    if (seedBatchPairs.length > 0) {
      const { data: mdData } = await db
        .from("stock_movements")
        .select("seed_id, batch_number, movement_date")
        .in("seed_id", rows.map((r) => r.seed_id));

      if (mdData) {
        for (const md of mdData) {
          const key = `${md.seed_id}::${md.batch_number}`;
          if (!movementDates[key]) movementDates[key] = { first: null, last: null };
          const cur = movementDates[key];
          if (!cur.first || md.movement_date < cur.first) cur.first = md.movement_date;
          if (!cur.last || md.movement_date > cur.last) cur.last = md.movement_date;
        }
      }
    }

    return rows.map((r) => {
      const key = `${r.seed_id}::${r.batch_number}`;
      const dates = movementDates[key] ?? { first: null, last: null };
      return {
        seed_id: r.seed_id,
        batch_number: r.batch_number,
        bag_stock: r.bag_stock,
        packet_stock: r.packet_stock,
        packets_per_bag: r.seed_product.packets_per_bag,
        variety: r.seed_product.variety,
        pack_size: r.seed_product.pack_size,
        crop_name: r.seed_product.crop.name,
        first_movement_date: dates.first,
        last_movement_date: dates.last,
        batch_status: computeBatchStatus(r.bag_stock, r.packet_stock),
      };
    });
  },

  async getMovements(
    db: SupabaseClient<Database>,
    seedId: string,
    batchNumber: string,
    params?: {
      page?: number;
      pageSize?: number;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<{ movements: StockMovementEntry[]; summary: BatchSummary; total: number }> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = db
      .from("stock_movements_with_balance" as "stock_movements")
      .select(
        `*, movement_by_profile:profiles!stock_movements_movement_by_fkey(name, role),
         approved_by_profile:profiles!stock_movements_approved_by_fkey(name),
         order:orders(order_number, dealer:dealers(name))`,
        { count: "exact" }
      )
      .eq("seed_id", seedId)
      .eq("batch_number", batchNumber);

    if (params?.dateFrom) query = query.gte("movement_date", params.dateFrom);
    if (params?.dateTo) query = query.lte("movement_date", params.dateTo);

    const { data, error, count } = await query
      .order("movement_date", { ascending: true })
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) throw error;

    const movements = (data ?? []).map((m: Record<string, unknown>) => {
      const rb = (m.running_balance_packets as number) ?? 0;
      const ppb = 1; // Will be overridden by component using batch.packets_per_bag
      return {
        ...m,
        running_balance_packets: rb,
        running_balance_bags: Math.floor(rb / ppb),
        running_balance_pkt_rem: rb % ppb,
      } as StockMovementEntry;
    });

    const summary = computeSummary(movements);

    return { movements, summary, total: count ?? 0 };
  },

  async getReconciliation(
    db: SupabaseClient<Database>,
    seedId: string,
    batchNumber: string
  ): Promise<ReconciliationResult> {
    const { data, error } = await db.rpc("check_batch_reconciliation", {
      p_seed_id: seedId,
      p_batch_number: batchNumber,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return row as ReconciliationResult;
  },
};
