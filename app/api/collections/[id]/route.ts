import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { collectionsQueries } from "@/lib/database/collections.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS, ROLES } from "@/constants/roles.constants";
import { z } from "zod";

const updateSchema = z.object({
  dealerId:       z.string().uuid().optional(),
  paymentMode:    z.enum(["CASH", "BANK_TRANSFER", "UPI", "CHEQUE"]).optional(),
  amount:         z.number().positive().optional(),
  collectionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes:          z.string().max(500).nullable().optional(),
});

export const PATCH = withAuth(
  async (req: NextRequest, ctx, { profile }) => {
    const { id } = await ctx.params;
    const db = getSupabaseAdminClient();

    const collection = await collectionsQueries.getById(db, id);
    if (!collection) return apiError("Collection not found", 404);

    // Staff can only edit their own collections
    if (profile.role === ROLES.STAFF && collection.staff_id !== profile.id) {
      return apiError("You can only edit your own collections", 403);
    }

    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const { dealerId, paymentMode, amount, collectionDate, notes } = parsed.data;

    const updated = await collectionsQueries.update(db, id, {
      ...(dealerId       !== undefined && { dealer_id:       dealerId }),
      ...(paymentMode    !== undefined && { payment_mode:    paymentMode }),
      ...(amount         !== undefined && { amount }),
      ...(collectionDate !== undefined && { collection_date: collectionDate }),
      ...(notes          !== undefined && { notes }),
    });

    return apiSuccess(updated, "Collection updated");
  },
  PERMISSIONS.COLLECTIONS_EDIT
);

export const DELETE = withAuth(
  async (_req: NextRequest, ctx, { profile }) => {
    const { id } = await ctx.params;
    const db = getSupabaseAdminClient();

    const collection = await collectionsQueries.getById(db, id);
    if (!collection) return apiError("Collection not found", 404);

    // Staff can only delete their own collections
    if (profile.role === ROLES.STAFF && collection.staff_id !== profile.id) {
      return apiError("You can only delete your own collections", 403);
    }

    await collectionsQueries.delete(db, id);
    return apiSuccess(null, "Collection deleted");
  },
  PERMISSIONS.COLLECTIONS_DELETE
);
