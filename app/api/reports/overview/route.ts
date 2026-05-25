import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/constants/roles.constants";

const ORDER_STATUSES = ["PENDING", "APPROVED", "PARTIALLY_APPROVED", "HOLD", "CANCELLED", "GODOWN_DISPATCHED", "TRANSPORT_DISPATCHED", "SHIPPED"] as const;

export const GET = withAuth(async () => {
  try {
    const db = getSupabaseAdminClient();

    const [
      statusCountResults,
      ordersWithItems,
      stockRows,
      dealerRows,
    ] = await Promise.all([
      Promise.all(
        ORDER_STATUSES.map(async (status) => {
          const { count } = await db
            .from("orders")
            .select("*", { count: "exact", head: true })
            .eq("status", status);
          return { status, count: count ?? 0 };
        })
      ),
      db
        .from("orders")
        .select("id, status, dealer_id, dealer:dealers(id, name, territory), items:order_items(seed_id, quantity, unit, seed:seed_products(variety, pack_size, packets_per_bag, crop:crops(name)))")
        .in("status", ["PENDING", "APPROVED", "PARTIALLY_APPROVED", "GODOWN_DISPATCHED", "TRANSPORT_DISPATCHED", "SHIPPED"]),
      db
        .from("seed_stock")
        .select("seed_id, bag_stock, packet_stock, seed:seed_products!inner(variety, pack_size, packets_per_bag, crop:crops!inner(name))"),
      db
        .from("orders")
        .select("dealer_id, status, dealer:dealers(id, name, territory)"),
    ]);

    // ── Orders by status ────────────────────────────────────────────────────
    const ordersByStatus = statusCountResults;
    const totalOrders = statusCountResults.reduce((sum, s) => sum + s.count, 0);
    const confirmedOrders = statusCountResults.find((s) => s.status === "APPROVED")?.count ?? 0;

    // ── Inventory aggregation ────────────────────────────────────────────────
    type StockSeed = { variety: string; pack_size: string; packets_per_bag: number; crop: { name: string } };
    type StockRow = { seed_id: string; bag_stock: number; packet_stock: number; seed: StockSeed };

    const invMap = new Map<string, { cropName: string; variety: string; packSize: string; packetsPerBag: number; totalBags: number; totalLoosePackets: number }>();

    for (const row of (stockRows.data ?? []) as StockRow[]) {
      const existing = invMap.get(row.seed_id);
      if (existing) {
        existing.totalBags += row.bag_stock;
        existing.totalLoosePackets += row.packet_stock;
      } else {
        invMap.set(row.seed_id, {
          cropName: row.seed?.crop?.name ?? "Unknown",
          variety: row.seed?.variety ?? "Unknown",
          packSize: row.seed?.pack_size ?? "—",
          packetsPerBag: row.seed?.packets_per_bag ?? 1,
          totalBags: row.bag_stock,
          totalLoosePackets: row.packet_stock,
        });
      }
    }

    const inventory = Array.from(invMap.entries())
      .map(([seedId, data]) => ({
        seedId,
        ...data,
        totalPacketsEquiv: data.totalBags * data.packetsPerBag + data.totalLoosePackets,
      }))
      .sort((a, b) => b.totalPacketsEquiv - a.totalPacketsEquiv);

    const totalInventoryPackets = inventory.reduce((s, i) => s + i.totalPacketsEquiv, 0);
    const lowStockCount = inventory.filter((i) => i.totalPacketsEquiv < 20).length;
    const criticalStockCount = inventory.filter((i) => i.totalPacketsEquiv < 5).length;

    // ── Top seeds by demand ──────────────────────────────────────────────────
    type ItemSeed = { variety: string; pack_size: string; packets_per_bag: number; crop: { name: string } };
    type OrderItem = { seed_id: string; quantity: number; unit: string; seed: ItemSeed };
    type OrderRow = { id: string; dealer_id: string; items: OrderItem[] };

    const seedDemand = new Map<string, {
      cropName: string; variety: string; packSize: string;
      orderedBags: number; orderedPackets: number; totalPacketsEquiv: number; orderCount: number;
    }>();

    for (const order of (ordersWithItems.data ?? []) as unknown as OrderRow[]) {
      for (const item of order.items ?? []) {
        const packs = item.seed?.packets_per_bag ?? 1;
        const existing = seedDemand.get(item.seed_id);
        const isBag = item.unit === "Bag" || item.unit === "Box";
        const equiv = isBag ? item.quantity * packs : item.quantity;
        if (existing) {
          if (isBag) existing.orderedBags += item.quantity;
          else existing.orderedPackets += item.quantity;
          existing.totalPacketsEquiv += equiv;
          existing.orderCount += 1;
        } else {
          seedDemand.set(item.seed_id, {
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

    const topSeeds = Array.from(seedDemand.entries())
      .map(([seedId, data]) => ({ seedId, ...data }))
      .sort((a, b) => b.totalPacketsEquiv - a.totalPacketsEquiv)
      .slice(0, 10);

    // ── Top dealers ──────────────────────────────────────────────────────────
    type DealerRef = { id: string; name: string; territory: string | null };
    type DealerRow = { dealer_id: string; status: string; dealer: DealerRef };

    const dealerMap = new Map<string, { name: string; territory: string | null; orderCount: number; confirmedCount: number }>();

    for (const row of (dealerRows.data ?? []) as unknown as DealerRow[]) {
      const id = row.dealer_id;
      const existing = dealerMap.get(id);
      if (existing) {
        existing.orderCount += 1;
        if (["APPROVED", "GODOWN_DISPATCHED", "TRANSPORT_DISPATCHED", "SHIPPED"].includes(row.status)) existing.confirmedCount += 1;
      } else {
        dealerMap.set(id, {
          name: row.dealer?.name ?? "Unknown",
          territory: row.dealer?.territory ?? null,
          orderCount: 1,
          confirmedCount: ["APPROVED", "GODOWN_DISPATCHED", "TRANSPORT_DISPATCHED", "SHIPPED"].includes(row.status) ? 1 : 0,
        });
      }
    }

    const topDealers = Array.from(dealerMap.entries())
      .map(([dealerId, data]) => ({ dealerId, ...data }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 10);

    const activeDealers = dealerMap.size;

    return apiSuccess({
      totalOrders,
      confirmedOrders,
      totalInventoryPackets,
      lowStockCount,
      criticalStockCount,
      activeDealers,
      ordersByStatus,
      inventory,
      topSeeds,
      topDealers,
    });
  } catch (err) {
    console.error("GET /api/reports/overview error:", err);
    return apiError("Failed to load overview", 500);
  }
}, PERMISSIONS.REPORTS_VIEW);
