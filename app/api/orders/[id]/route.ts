import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ordersQueries } from "@/lib/database/orders.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS, ROLES } from "@/constants/roles.constants";

export const GET = withAuth(
  async (_req: NextRequest, ctx, auth) => {
    const { id } = await ctx.params;
    const db = getSupabaseAdminClient();
    const order = await ordersQueries.getById(db, id, auth.orgId).catch(() => null);

    if (!order) return apiError("Order not found", 404);
    if (auth.profile.role === ROLES.STAFF && order.staff_id !== auth.profile.id) {
      return apiError("Forbidden", 403);
    }
    return apiSuccess(order);
  },
  PERMISSIONS.ORDERS_VIEW
);

export const DELETE = withAuth(
  async (_req: NextRequest, ctx, auth) => {
    const { id } = await ctx.params;
    const db = getSupabaseAdminClient();

    const existing = await ordersQueries.getById(db, id, auth.orgId).catch(() => null);
    if (!existing) return apiError("Order not found", 404);
    if (auth.profile.role === ROLES.STAFF && existing.staff_id !== auth.profile.id) {
      return apiError("Forbidden", 403);
    }

    await ordersQueries.delete(db, id, auth.orgId);
    return apiSuccess(null, "Order deleted");
  },
  PERMISSIONS.ORDERS_DELETE
);

export const PATCH = withAuth(
  async (req: NextRequest, ctx, auth) => {
    try {
      const { id } = await ctx.params;
      const body = await req.json().catch(() => ({}));
      const db = getSupabaseAdminClient();

      const existing = await ordersQueries.getById(db, id, auth.orgId).catch(() => null);
      if (!existing) return apiError("Order not found", 404);
      if (auth.profile.role === ROLES.STAFF && existing.staff_id !== auth.profile.id) {
        return apiError("Forbidden", 403);
      }

      if (Array.isArray(body.items) && body.items.length > 0) {
        await ordersQueries.updateItems(db, auth.orgId, body.items);
      }

      const order = await ordersQueries.update(db, id, auth.orgId, {
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
