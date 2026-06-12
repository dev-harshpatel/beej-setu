import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { reportsQueries } from "@/lib/database/reports.queries";
import { PERMISSIONS, ROLES } from "@/constants/roles.constants";

export const GET = withAuth(async (_req, _ctx, auth) => {
  try {
    const db      = getSupabaseAdminClient();
    const staffId = auth.profile.role === ROLES.STAFF ? auth.profile.id : null;
    const result  = await reportsQueries.getOverview(db, auth.orgId, staffId);
    return apiSuccess(result);
  } catch (err) {
    console.error("GET /api/reports/overview error:", err);
    return apiError("Failed to load overview", 500);
  }
}, PERMISSIONS.REPORTS_VIEW);
