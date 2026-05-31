import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { stockMovementsQueries } from "@/lib/database/stock-movements.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";

// GET /api/stock/batches?seedId=<uuid>           — batches for a specific seed (approval/challan)
// GET /api/stock/batches?cropId=&variety=&...    — filtered batch list (stock ledger)
export const GET = withAuth(
  async (req: NextRequest, _ctx, _auth) => {
    try {
      const { searchParams } = req.nextUrl;
      const db = getSupabaseAdminClient();

      // Direct seed lookup: return all non-depleted batches for that seed, ordered FIFO.
      const seedId = searchParams.get("seedId");
      if (seedId) {
        const { data, error } = await db
          .from("seed_stock")
          .select("batch_number, bag_stock, packet_stock")
          .eq("seed_id", seedId)
          .or("bag_stock.gt.0,packet_stock.gt.0")
          .order("created_at", { ascending: true });
        if (error) throw error;
        return apiSuccess(data ?? []);
      }

      // Filtered batch list for stock ledger
      const batches = await stockMovementsQueries.getBatches(db, {
        cropId:      searchParams.get("cropId")      ?? undefined,
        variety:     searchParams.get("variety")     ?? undefined,
        packSize:    searchParams.get("packSize")     ?? undefined,
        batchNumber: searchParams.get("batchNumber") ?? undefined,
      });

      return apiSuccess(batches);
    } catch (err) {
      console.error("GET /api/stock/batches error:", err);
      return apiError("Failed to fetch stock batches", 500);
    }
  },
  PERMISSIONS.ORDERS_VIEW
);
