import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ordersQueries } from "@/lib/database/orders.queries";
import { withAuth, apiSuccess } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";
import type { OrderWithRelations } from "@/types/order.types";

export const GET = withAuth(
  async (req: NextRequest, _ctx, _auth) => {
    const { searchParams } = req.nextUrl;
    const seedId   = searchParams.get("seedId")   ?? undefined;
    const dateFrom = searchParams.get("dateFrom") ?? undefined;
    const dateTo   = searchParams.get("dateTo")   ?? undefined;

    const db = getSupabaseAdminClient();

    const { data: orders } = await ordersQueries.getAll(db, {
      dateFrom,
      dateTo,
      pageSize: 500,
    });

    const rows = (orders as unknown as OrderWithRelations[]).flatMap((order) =>
      (order.items ?? [])
        .filter((item) => !seedId || item.seed_id === seedId)
        .map((item) => ({
          order_id:          order.id,
          order_number:      order.order_number,
          order_date:        order.created_at,
          order_status:      order.status,
          dealer_id:         order.dealer?.id ?? null,
          dealer_name:       order.dealer?.name ?? null,
          dealer_territory:  order.dealer?.territory ?? null,
          seed_id:           item.seed_id,
          crop_name:         (item.seed as { crops?: { name: string } | null } | null)?.crops?.name ?? null,
          variety:           item.seed?.variety ?? null,
          pack_size:         item.seed?.pack_size ?? null,
          quantity:          item.quantity,
          unit:              item.unit,
        }))
    );

    return apiSuccess({ data: rows, total: rows.length });
  },
  PERMISSIONS.REPORTS_VIEW
);
