import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ordersQueries } from "@/lib/database/orders.queries";
import { dealersQueries } from "@/lib/database/dealers.queries";
import { seedsQueries } from "@/lib/database/seeds.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS, ROLES } from "@/constants/roles.constants";
import { generateOrderNumber, getFinancialYear } from "@/lib/utils";
import { ORDER_ELIGIBLE_STATUSES } from "@/constants/dealer-status.constants";

export const GET = withAuth(
  async (req: NextRequest, _ctx, auth) => {
    const { searchParams } = req.nextUrl;
    const db = getSupabaseAdminClient();

    // STAFF can only see orders they created — ignore any staffId from query params
    const staffId = auth.profile.role === ROLES.STAFF
      ? auth.profile.id
      : (searchParams.get("staffId") ?? undefined);

    const statusesParam = searchParams.get("statuses");
    const result = await ordersQueries.getAll(db, auth.orgId, {
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 20),
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      statuses: statusesParam ? statusesParam.split(",") : undefined,
      dealerId: searchParams.get("dealerId") ?? undefined,
      staffId,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
    });

    return apiSuccess(result);
  },
  PERMISSIONS.ORDERS_VIEW
);

export const POST = withAuth(
  async (req: NextRequest, _ctx, { profile, orgId }) => {
    try {
      const body = await req.json().catch(() => null);
      if (!body?.dealerId || !Array.isArray(body?.items) || body.items.length === 0) {
        return apiError("dealerId and at least one item are required", 400);
      }

      const db = getSupabaseAdminClient();

      // Org-scoped getById doubles as the cross-tenant check for dealerId
      const dealer = await dealersQueries.getById(db, body.dealerId, orgId).catch(() => null);
      if (!dealer) return apiError("Dealer not found", 404);
      if (!ORDER_ELIGIBLE_STATUSES.includes(dealer.status as typeof ORDER_ELIGIBLE_STATUSES[number])) {
        return apiError(`Orders can only be placed for active dealers (current status: ${dealer.status})`, 422);
      }

      const seedIds: string[] = body.items.map((item: { seedId: string }) => item.seedId);
      const validSeedIds = await seedsQueries.getExistingIds(db, seedIds, orgId);
      const invalidSeedId = seedIds.find((sid) => !validSeedIds.has(sid));
      if (invalidSeedId) {
        return apiError(`Seed product ${invalidSeedId} not found`, 404);
      }

      const fy = getFinancialYear();
      const serial = await ordersQueries.getNextSerial(db, orgId, fy);

      const order = await ordersQueries.create(
        db,
        orgId,
        {
          order_number:    generateOrderNumber(serial),
          dealer_id:       body.dealerId,
          staff_id:        profile.id,
          center:          body.center          ?? null,
          transport_name:  body.transportName   ?? null,
          delivery_center: body.deliveryCenter  ?? null,
          delivery_date:   body.deliveryDate    ?? null,
          notes:           body.notes           ?? null,
        },
        body.items.map((item: { seedId: string; unit: string; quantity: number; notes?: string }) => ({
          order_id:           "",
          seed_id:            item.seedId,
          unit:               item.unit ?? "Bag",
          quantity:           item.quantity,
          requested_quantity: item.quantity,
          notes:              item.notes ?? null,
        }))
      );

      return apiSuccess(order, "Order created", 201);
    } catch (err) {
      console.error("POST /api/orders error:", err);
      const message = err instanceof Error ? err.message : "Failed to create order";
      return apiError(message, 500);
    }
  },
  PERMISSIONS.ORDERS_CREATE
);
