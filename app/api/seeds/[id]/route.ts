import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { seedsQueries } from "@/lib/database/seeds.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";

// GET /api/seeds/:id
export const GET = withAuth(
  async (_req: NextRequest, ctx, _auth) => {
    const { id } = await ctx.params;
    const db = getSupabaseAdminClient();
    const product = await seedsQueries.getById(db, id);

    if (!product) return apiError("Seed product not found", 404);
    return apiSuccess(product);
  },
  PERMISSIONS.SEEDS_VIEW
);
