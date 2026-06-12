import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ordersQueries } from "@/lib/database/orders.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";

export const POST = withAuth(
  async (req: NextRequest, _ctx, { orgId }) => {
    const body = await req.json().catch(() => ({}));
    const ids: unknown = body.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return apiError("ids must be a non-empty array", 400);
    }

    const db = getSupabaseAdminClient();
    await ordersQueries.bulkDelete(db, ids as string[], orgId);
    return apiSuccess(null, `${ids.length} order(s) deleted`);
  },
  PERMISSIONS.ORDERS_DELETE
);
