import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { stockMovementsQueries } from "@/lib/database/stock-movements.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";

// GET /api/stock/movements?seedId=&batchNumber=&page=1&pageSize=50&dateFrom=&dateTo=
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
      const result = await stockMovementsQueries.getMovements(db, seedId, batchNumber, {
        page:     Number(searchParams.get("page")     ?? 1),
        pageSize: Number(searchParams.get("pageSize") ?? 50),
        dateFrom: searchParams.get("dateFrom") ?? undefined,
        dateTo:   searchParams.get("dateTo")   ?? undefined,
      });

      return apiSuccess(result);
    } catch (err) {
      console.error("GET /api/stock/movements error:", err);
      return apiError("Failed to fetch stock movements", 500);
    }
  },
  PERMISSIONS.STOCK_VIEW
);
