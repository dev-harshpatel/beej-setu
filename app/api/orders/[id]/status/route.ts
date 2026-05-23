import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ordersQueries } from "@/lib/database/orders.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";
import type { OrderRow } from "@/types/database.types";

const VALID_STATUSES: OrderRow["status"][] = [
  "DRAFT", "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED",
];

export const PATCH = withAuth(
  async (req: NextRequest, ctx, _auth) => {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));

    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      return apiError(`status must be one of: ${VALID_STATUSES.join(", ")}`, 400);
    }

    const db = getSupabaseAdminClient();

    let order;
    if (body.status === "CONFIRMED") {
      try {
        order = await ordersQueries.confirmWithStockDeduction(db, id);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to confirm order";
        return apiError(msg.includes("Insufficient stock") ? msg : "Failed to deduct stock — check inventory levels", 422);
      }
    } else {
      order = await ordersQueries.updateStatus(db, id, body.status);
    }

    return apiSuccess(order, "Status updated");
  },
  PERMISSIONS.ORDERS_EDIT
);
