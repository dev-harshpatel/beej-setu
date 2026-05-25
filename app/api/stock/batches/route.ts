import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { stockMovementsQueries } from "@/lib/database/stock-movements.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";

// GET /api/stock/batches?cropId=&variety=&packSize=&batchNumber=
export const GET = withAuth(
  async (req: NextRequest, _ctx, _auth) => {
    try {
      const { searchParams } = req.nextUrl;
      const db = getSupabaseAdminClient();

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
  PERMISSIONS.STOCK_VIEW
);
