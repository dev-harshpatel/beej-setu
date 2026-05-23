import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ordersQueries } from "@/lib/database/orders.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";

export const GET = withAuth(
  async (_req: NextRequest, ctx, _auth) => {
    const { id } = await ctx.params;
    const db = getSupabaseAdminClient();
    const order = await ordersQueries.getById(db, id);

    if (!order) return apiError("Order not found", 404);
    return apiSuccess(order);
  },
  PERMISSIONS.ORDERS_VIEW
);

export const PATCH = withAuth(
  async (req: NextRequest, ctx, _auth) => {
    try {
      const { id } = await ctx.params;
      const body = await req.json().catch(() => ({}));
      const db = getSupabaseAdminClient();

      if (Array.isArray(body.items) && body.items.length > 0) {
        await ordersQueries.updateItems(db, body.items);
      }

      const order = await ordersQueries.update(db, id, {
        notes: body.notes,
        delivery_date: body.deliveryDate,
      });

      return apiSuccess(order, "Order updated");
    } catch (err) {
      console.error("PATCH /api/orders/[id] error:", err);
      return apiError("Failed to update order", 500);
    }
  },
  PERMISSIONS.ORDERS_EDIT
);
