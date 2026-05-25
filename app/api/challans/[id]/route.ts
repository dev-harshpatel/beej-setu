import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";
import { ORDER_STATUSES } from "@/constants/order-status.constants";

// GET /api/challans/:id — fetch challan by order_id
export const GET = withAuth(
  async (_req: NextRequest, ctx) => {
    const { id } = await ctx.params;
    const db = getSupabaseAdminClient();

    const { data, error } = await db
      .from("challans")
      .select("*")
      .eq("order_id", id)
      .maybeSingle();

    if (error) return apiError("Failed to fetch challan", 500);

    return apiSuccess(data, "OK");
  },
  PERMISSIONS.CHALLAN_MANAGE
);

// PATCH /api/challans/:id
// Updates transport_dispatch_date and advances order to TRANSPORT_DISPATCHED.
export const PATCH = withAuth(
  async (req: NextRequest, ctx) => {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));

    if (!body.transport_dispatch_date) {
      return apiError("transport_dispatch_date is required", 400);
    }

    const db = getSupabaseAdminClient();

    // Fetch challan by order_id to get the challan record
    const { data: challan, error: fetchErr } = await db
      .from("challans")
      .select("id, order_id")
      .eq("order_id", id)
      .single();

    if (fetchErr || !challan) {
      return apiError("Challan not found for this order", 404);
    }

    // Update transport dispatch date
    const { data: updated, error: updateErr } = await db
      .from("challans")
      .update({ transport_dispatch_date: body.transport_dispatch_date })
      .eq("id", challan.id)
      .select()
      .single();

    if (updateErr) return apiError("Failed to update challan", 500);

    // Advance order to TRANSPORT_DISPATCHED
    await db
      .from("orders")
      .update({ status: ORDER_STATUSES.TRANSPORT_DISPATCHED })
      .eq("id", challan.order_id);

    return apiSuccess(updated, "Transport dispatch date saved — order marked Transport Dispatched");
  },
  PERMISSIONS.CHALLAN_MANAGE
);
