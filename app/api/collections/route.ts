import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { collectionsQueries } from "@/lib/database/collections.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS, ROLES } from "@/constants/roles.constants";
import { z } from "zod";

const createCollectionSchema = z.object({
  dealerId:       z.string().uuid("Invalid dealer"),
  paymentMode:    z.enum(["CASH", "BANK_TRANSFER", "UPI", "CHEQUE"]),
  amount:         z.number().positive("Amount must be greater than 0"),
  collectionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  notes:          z.string().max(500).optional(),
});

export const GET = withAuth(
  async (req: NextRequest, _ctx, { profile }) => {
    const { searchParams } = req.nextUrl;
    const db = getSupabaseAdminClient();

    // STAFF only see their own collections
    const staffId =
      profile.role === ROLES.STAFF
        ? profile.id
        : (searchParams.get("staffId") ?? undefined);

    const result = await collectionsQueries.getAll(db, {
      staffId,
      dealerId:  searchParams.get("dealerId")  ?? undefined,
      dateFrom:  searchParams.get("dateFrom")  ?? undefined,
      dateTo:    searchParams.get("dateTo")    ?? undefined,
    });

    return apiSuccess(result);
  },
  PERMISSIONS.COLLECTIONS_VIEW
);

export const POST = withAuth(
  async (req: NextRequest, _ctx, { profile }) => {
    const body   = await req.json().catch(() => null);
    const parsed = createCollectionSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const { dealerId, paymentMode, amount, collectionDate, notes } = parsed.data;
    const db = getSupabaseAdminClient();

    const collection = await collectionsQueries.create(db, {
      dealer_id:       dealerId,
      staff_id:        profile.id,
      payment_mode:    paymentMode,
      amount,
      collection_date: collectionDate,
      notes:           notes ?? null,
    });

    return apiSuccess(collection, "Collection recorded", 201);
  },
  PERMISSIONS.COLLECTIONS_CREATE
);
