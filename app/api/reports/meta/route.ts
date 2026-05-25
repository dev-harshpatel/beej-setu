import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { reportsQueries } from "@/lib/database/reports.queries";
import { withAuth, apiSuccess } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";
import type { ProfileRow } from "@/types/database.types";

export const GET = withAuth(
  async (_req, _ctx, _auth) => {
    const db = getSupabaseAdminClient();

    const [territories, staffResult] = await Promise.all([
      reportsQueries.getTerritories(db),
      db
        .from("profiles")
        .select("id, name, territory")
        .eq("role", "STAFF")
        .eq("is_active", true)
        .order("name"),
    ]);

    return apiSuccess({
      territories,
      staffList: (staffResult.data ?? []) as Pick<ProfileRow, "id" | "name" | "territory">[],
    });
  },
  PERMISSIONS.REPORTS_VIEW
);
