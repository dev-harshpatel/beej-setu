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
  async (req: NextRequest, ctx, { orgId }) => {
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
        order = await ordersQueries.approveWithStockDeduction(db, id, orgId, status);
      } catch (err: unknown) {
        // PostgrestError from Supabase v2 is NOT instanceof Error — read .message directly.
        const msg =
          (err as { message?: string })?.message ??
          (err instanceof Error ? err.message : "Failed to approve order");
        const isStockError = msg.includes("Insufficient stock") || msg.includes("must be PENDING");
        return apiError(isStockError ? msg : `Failed to deduct stock — check inventory levels`, 422);
      }

      // For partial approvals, persist the reason (deliberate vs backorder).
      if (status === ORDER_STATUSES.PARTIALLY_APPROVED && body.partial_reason) {
        const reason = body.partial_reason as "deliberate" | "backorder";
        await db.from("orders").update({ partial_reason: reason }).eq("id", id).eq("organization_id", orgId);
      }

      // Save per-item batch assignments selected by admin.
      const itemBatches = body.itemBatches as { itemId: string; batchNumber: string }[] | undefined;
      if (Array.isArray(itemBatches) && itemBatches.length > 0) {
        await Promise.all(
          itemBatches.map(({ itemId, batchNumber }) =>
            db.from("order_items")
              .update({ batch_number: batchNumber })
              .eq("id", itemId)
              .eq("organization_id", orgId)
              .throwOnError()
          )
        );
      }
      order = await ordersQueries.getById(db, id, orgId);
    } else {
      order = await ordersQueries.updateStatus(db, id, orgId, status);
    }

    return apiSuccess(order, "Status updated");
  },
  PERMISSIONS.ORDERS_EDIT,
);
