import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";

export type SeedAvailability = {
  seed_id: string;
  bag_stock: number;
  packet_stock: number;
  packets_per_bag: number;
};

// GET /api/stock/availability?seedIds=id1,id2,...
export const GET = withAuth(
  async (req: NextRequest) => {
    const raw = req.nextUrl.searchParams.get("seedIds") ?? "";
    const seedIds = raw.split(",").map((s) => s.trim()).filter(Boolean);

    if (seedIds.length === 0) return apiError("seedIds is required", 400);

    const db = getSupabaseAdminClient();

    const { data, error } = await db
      .from("seed_stock")
      .select("seed_id, bag_stock, packet_stock, seed_product:seed_products!inner(packets_per_bag)")
      .in("seed_id", seedIds);

    if (error) {
      console.error("GET /api/stock/availability error:", error);
      return apiError("Failed to fetch stock availability", 500);
    }

    // Aggregate across batches per seed_id
    const map: Record<string, SeedAvailability> = {};
    for (const row of data ?? []) {
      const ppb = (row.seed_product as unknown as { packets_per_bag: number })?.packets_per_bag ?? 1;
      if (!map[row.seed_id]) {
        map[row.seed_id] = { seed_id: row.seed_id, bag_stock: 0, packet_stock: 0, packets_per_bag: ppb };
      }
      map[row.seed_id].bag_stock += row.bag_stock;
      map[row.seed_id].packet_stock += row.packet_stock;
    }

    return apiSuccess(Object.values(map));
  },
  PERMISSIONS.STOCK_VIEW
);
