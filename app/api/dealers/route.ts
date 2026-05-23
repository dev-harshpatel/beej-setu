import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dealersQueries } from "@/lib/database/dealers.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS, ROLES } from "@/constants/roles.constants";
import { createDealerSchema } from "@/lib/validators/dealers.validators";

export const GET = withAuth(
  async (req: NextRequest, _ctx, { profile }) => {
    const { searchParams } = req.nextUrl;
    const db = getSupabaseAdminClient();

    // STAFF can only ever see their own dealers — ignore any client-supplied staffId
    const staffId =
      profile.role === ROLES.STAFF
        ? profile.id
        : (searchParams.get("staffId") ?? undefined);

    const result = await dealersQueries.getAll(db, {
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 20),
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      staffId,
      territory: searchParams.get("territory") ?? undefined,
    });

    return apiSuccess(result);
  },
  PERMISSIONS.DEALERS_VIEW
);

export const POST = withAuth(
  async (req: NextRequest, _ctx, _auth) => {
    const body = await req.json().catch(() => null);
    const parsed = createDealerSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const { name, staffId, contact, defaultTransport, defaultDeliveryInstruction, deliveryInstruction, territory, notes } = parsed.data;
    const db = getSupabaseAdminClient();

    const dealer = await dealersQueries.create(db, {
      name,
      staff_id: staffId ?? null,
      contact,
      default_transport: defaultTransport ?? null,
      default_delivery_instruction: defaultDeliveryInstruction ?? null,
      delivery_instruction: deliveryInstruction ?? null,
      territory: territory ?? null,
      notes: notes ?? null,
    });

    return apiSuccess(dealer, "Dealer created", 201);
  },
  PERMISSIONS.DEALERS_CREATE
);
