import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { seedsQueries } from "@/lib/database/seeds.queries";
import { withAuth, apiSuccess } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";

// GET /api/crops — full list, no pagination (20 crops max)
export const GET = withAuth(
  async (_req, _ctx, _auth) => {
    const db = getSupabaseAdminClient();
    const crops = await seedsQueries.getAllCrops(db);
    return apiSuccess(crops);
  },
  PERMISSIONS.SEEDS_VIEW
);
