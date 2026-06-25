import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dealersQueries } from "@/lib/database/dealers.queries";
import { withAuth, apiSuccess } from "@/lib/api/auth-guard";
import { PERMISSIONS, ROLES } from "@/constants/roles.constants";

export const GET = withAuth(
  async (_req: NextRequest, _ctx, { profile, orgId }) => {
    const db = getSupabaseAdminClient();
    const staffId = profile.role === ROLES.STAFF ? profile.id : undefined;
    const territories = await dealersQueries.getDistinctTerritories(db, orgId, staffId);
    return apiSuccess(territories);
  },
  PERMISSIONS.DEALERS_VIEW
);
