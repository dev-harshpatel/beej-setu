import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";
import { ORDER_STATUSES } from "@/constants/order-status.constants";

// POST /api/challans
// Creates a challan record and advances the order to GODOWN_DISPATCHED.
export const POST = withAuth(
  async (req: NextRequest, _ctx, auth) => {
    const body = await req.json().catch(() => ({}));

    const { order_id, challan_number, transport_name, lr_number, godown_dispatch_date } = body;

    if (!order_id || !challan_number) {
      return apiError("order_id and challan_number are required", 400);
    }

    const db = getSupabaseAdminClient();

    // Verify the order exists and is eligible for challan creation
    const { data: order, error: orderErr } = await db
      .from("orders")
      .select("id, status")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) {
      return apiError("Order not found", 404);
    }

    if (!["APPROVED", "PARTIALLY_APPROVED"].includes(order.status)) {
      return apiError(
        `Order must be APPROVED or PARTIALLY_APPROVED to create a challan (current: ${order.status})`,
        422
      );
    }

    // Insert challan
    const { data: challan, error: challanErr } = await db
      .from("challans")
      .insert({
        order_id,
        challan_number,
        transport_name: transport_name || null,
        lr_number: lr_number || null,
        godown_dispatch_date: godown_dispatch_date || new Date().toISOString().split("T")[0],
        created_by: auth.profile.id,
      })
      .select()
      .single();

    if (challanErr) {
      if (challanErr.code === "23505") {
        return apiError("A challan already exists for this order", 409);
      }
      return apiError("Failed to create challan", 500);
    }

    // Advance order status to GODOWN_DISPATCHED
    await db
      .from("orders")
      .update({ status: ORDER_STATUSES.GODOWN_DISPATCHED })
      .eq("id", order_id);

    return apiSuccess(challan, "Challan created — order marked Godown Dispatched", 201);
  },
  PERMISSIONS.CHALLAN_MANAGE
);
