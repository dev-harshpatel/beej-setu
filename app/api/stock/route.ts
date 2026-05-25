import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { stockQueries } from "@/lib/database/stock.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";

// GET /api/stock?page=1&pageSize=20&cropId=&search=
export const GET = withAuth(
  async (req: NextRequest, _ctx, _auth) => {
    try {
      const { searchParams } = req.nextUrl;
      const db = getSupabaseAdminClient();
      const result = await stockQueries.getAll(db, {
        page:     Number(searchParams.get("page")     ?? 1),
        pageSize: Number(searchParams.get("pageSize") ?? 20),
        cropId:   searchParams.get("cropId")  ?? undefined,
        search:   searchParams.get("search")  ?? undefined,
      });
      return apiSuccess(result);
    } catch (err) {
      console.error("GET /api/stock error:", err);
      return apiError("Failed to fetch stock", 500);
    }
  },
  PERMISSIONS.STOCK_VIEW
);

// POST /api/stock  (admin only)
export const POST = withAuth(
  async (req: NextRequest, _ctx, { profile }) => {
    const body = await req.json().catch(() => null);
    if (!body?.seedId || !body?.batchNumber) {
      return apiError("seedId and batchNumber are required", 400);
    }
    const db = getSupabaseAdminClient();
    const row = await stockQueries.create(db, {
      seed_id:         body.seedId,
      batch_number:    body.batchNumber,
      bag_stock:       Number(body.bagStock)    || 0,
      packet_stock:    Number(body.packetStock) || 0,
      last_updated_by: profile.id,
      notes:           body.notes        ?? null,
      movement_date:   body.movementDate ?? null,
    });
    return apiSuccess(row, "Stock batch created", 201);
  },
  PERMISSIONS.STOCK_MANAGE
);
