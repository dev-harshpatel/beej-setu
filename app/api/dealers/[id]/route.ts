import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dealersQueries } from "@/lib/database/dealers.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";
import { updateDealerSchema } from "@/lib/validators/dealers.validators";

export const GET = withAuth(
  async (_req: NextRequest, ctx, _auth) => {
    const { id } = await ctx.params;
    const db = getSupabaseAdminClient();
    const dealer = await dealersQueries.getById(db, id);

    if (!dealer) return apiError("Dealer not found", 404);
    return apiSuccess(dealer);
  },
  PERMISSIONS.DEALERS_VIEW
);

export const PATCH = withAuth(
  async (req: NextRequest, ctx, _auth) => {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const parsed = updateDealerSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const { name, staffId, contact, defaultTransport, defaultDeliveryInstruction, deliveryInstruction, territory, notes, status } = parsed.data;
    const db = getSupabaseAdminClient();

    const dealer = await dealersQueries.update(db, id, {
      ...(name !== undefined && { name }),
      ...(staffId !== undefined && { staff_id: staffId }),
      ...(contact !== undefined && { contact }),
      ...(defaultTransport !== undefined && { default_transport: defaultTransport }),
      ...(defaultDeliveryInstruction !== undefined && { default_delivery_instruction: defaultDeliveryInstruction }),
      ...(deliveryInstruction !== undefined && { delivery_instruction: deliveryInstruction }),
      ...(territory !== undefined && { territory }),
      ...(notes !== undefined && { notes }),
      ...(status !== undefined && { status }),
    });

    return apiSuccess(dealer, "Dealer updated");
  },
  PERMISSIONS.DEALERS_EDIT
);

export const DELETE = withAuth(
  async (_req: NextRequest, ctx, _auth) => {
    const { id } = await ctx.params;
    const db = getSupabaseAdminClient();
    await dealersQueries.softDelete(db, id);
    return apiSuccess(null, "Dealer deleted");
  },
  PERMISSIONS.DEALERS_DELETE
);
