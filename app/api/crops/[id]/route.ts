import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { seedsQueries } from "@/lib/database/seeds.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";

// PATCH /api/crops/:id — rename a crop
export const PATCH = withAuth(
  async (req: NextRequest, ctx, { orgId }) => {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const raw = body?.name;

    if (!raw || typeof raw !== "string" || !raw.trim()) {
      return apiError("Crop name is required", 400);
    }

    const name = raw.trim();
    if (name.length < 2)   return apiError("Crop name must be at least 2 characters", 400);
    if (name.length > 100) return apiError("Crop name is too long", 400);

    const db   = getSupabaseAdminClient();
    const crop = await seedsQueries.updateCrop(db, id, orgId, name);
    return apiSuccess(crop, "Crop renamed");
  },
  PERMISSIONS.SEEDS_EDIT,
);
