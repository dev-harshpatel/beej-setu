import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { stockQueries } from "@/lib/database/stock.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";

type Ctx = { params: Promise<Record<string, string>> };

// PATCH /api/stock/[id]
export const PATCH = withAuth(
  async (req: NextRequest, ctx: Ctx, { profile }) => {
    try {
      const { id } = await ctx.params;
      const body = await req.json().catch(() => null);
      if (!body) return apiError("Request body required", 400);

      const db  = getSupabaseAdminClient();
      const row = await stockQueries.update(
        db, id,
        {
          bag_stock:    body.bagStock    !== undefined ? Number(body.bagStock)    : undefined,
          packet_stock: body.packetStock !== undefined ? Number(body.packetStock) : undefined,
        },
        profile.id
      );
      return apiSuccess(row, "Stock updated");
    } catch (err) {
      console.error("PATCH /api/stock/[id] error:", err);
      return apiError("Failed to update stock", 500);
    }
  },
  PERMISSIONS.STOCK_MANAGE
);

// DELETE /api/stock/[id]
export const DELETE = withAuth(
  async (_req: NextRequest, ctx: Ctx, _auth) => {
    try {
      const { id } = await ctx.params;
      const db = getSupabaseAdminClient();
      await stockQueries.remove(db, id);
      return apiSuccess(null, "Stock batch deleted");
    } catch (err) {
      console.error("DELETE /api/stock/[id] error:", err);
      return apiError("Failed to delete stock batch", 500);
    }
  },
  PERMISSIONS.STOCK_MANAGE
);
