import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { stockMovementsQueries } from "@/lib/database/stock-movements.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";

// GET /api/stock/reconciliation?seedId=&batchNumber=
export const GET = withAuth(
  async (req: NextRequest, _ctx, _auth) => {
    try {
      const { searchParams } = req.nextUrl;
      const seedId      = searchParams.get("seedId");
      const batchNumber = searchParams.get("batchNumber");

      if (!seedId || !batchNumber) {
        return apiError("seedId and batchNumber are required", 400);
      }

      const db = getSupabaseAdminClient();
      const result = await stockMovementsQueries.getReconciliation(db, seedId, batchNumber);

      return apiSuccess(result);
    } catch (err) {
      console.error("GET /api/stock/reconciliation error:", err);
      return apiError("Failed to fetch reconciliation status", 500);
    }
  },
  PERMISSIONS.STOCK_VIEW
);
