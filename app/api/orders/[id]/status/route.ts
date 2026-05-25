import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ordersQueries } from "@/lib/database/orders.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";
import {
  ORDER_STATUSES,
  type OrderStatusValue,
} from "@/constants/order-status.constants";

// Derived directly from the constants — add new statuses there, not here.
const VALID_STATUSES: OrderStatusValue[] = Object.values(ORDER_STATUSES);

export const PATCH = withAuth(
  async (req: NextRequest, ctx, _auth) => {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));

    if (!body.status || !VALID_STATUSES.includes(body.status as OrderStatusValue)) {
      return apiError(`status must be one of: ${VALID_STATUSES.join(", ")}`, 400);
    }

    const status = body.status as OrderStatusValue;
    const db = getSupabaseAdminClient();

    // APPROVED and PARTIALLY_APPROVED both trigger stock deduction via the DB function.
    // The function validates the order is PENDING and atomically deducts stock.
    const isApproval =
      status === ORDER_STATUSES.APPROVED ||
      status === ORDER_STATUSES.PARTIALLY_APPROVED;

    let order;
    if (isApproval) {
      try {
        order = await ordersQueries.approveWithStockDeduction(db, id, status);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to approve order";
        return apiError(
          msg.includes("Insufficient stock") ? msg : "Failed to deduct stock — check inventory levels",
          422,
        );
      }
    } else {
      order = await ordersQueries.updateStatus(db, id, status);
    }

    return apiSuccess(order, "Status updated");
  },
  PERMISSIONS.ORDERS_EDIT,
);
