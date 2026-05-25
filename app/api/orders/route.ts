import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ordersQueries } from "@/lib/database/orders.queries";
import { dealersQueries } from "@/lib/database/dealers.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";
import { generateOrderNumber } from "@/lib/utils";
import { ORDER_ELIGIBLE_STATUSES } from "@/constants/dealer-status.constants";

export const GET = withAuth(
  async (req: NextRequest, _ctx, _auth) => {
    const { searchParams } = req.nextUrl;
    const db = getSupabaseAdminClient();

    const result = await ordersQueries.getAll(db, {
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 20),
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      dealerId: searchParams.get("dealerId") ?? undefined,
      staffId: searchParams.get("staffId") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
    });

    return apiSuccess(result);
  },
  PERMISSIONS.ORDERS_VIEW
);

export const POST = withAuth(
  async (req: NextRequest, _ctx, { profile }) => {
    const body = await req.json().catch(() => null);
    if (!body?.dealerId || !Array.isArray(body?.items) || body.items.length === 0) {
      return apiError("dealerId and at least one item are required", 400);
    }

    const db = getSupabaseAdminClient();

    const dealer = await dealersQueries.getById(db, body.dealerId);
    if (!dealer) return apiError("Dealer not found", 404);
    if (!ORDER_ELIGIBLE_STATUSES.includes(dealer.status as typeof ORDER_ELIGIBLE_STATUSES[number])) {
      return apiError(`Orders can only be placed for active dealers (current status: ${dealer.status})`, 422);
    }

    const order = await ordersQueries.create(
      db,
      {
        order_number:    generateOrderNumber(),
        dealer_id:       body.dealerId,
        staff_id:        profile.id,
        center:          body.center          ?? null,
        transport_name:  body.transportName   ?? null,
        delivery_center: body.deliveryCenter  ?? null,
        delivery_date:   body.deliveryDate    ?? null,
        notes:           body.notes           ?? null,
      },
      body.items.map((item: { seedId: string; unit: string; quantity: number; notes?: string }) => ({
        order_id: "",
        seed_id:  item.seedId,
        unit:     item.unit ?? "Bag",
        quantity: item.quantity,
        notes:    item.notes ?? null,
      }))
    );

    return apiSuccess(order, "Order created", 201);
  },
  PERMISSIONS.ORDERS_CREATE
);
