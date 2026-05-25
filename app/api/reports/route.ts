import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { reportsQueries } from "@/lib/database/reports.queries";
import { withAuth, apiSuccess } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";

export const GET = withAuth(
  async (req: NextRequest, _ctx, _auth) => {
    const { searchParams } = req.nextUrl;
    const db = getSupabaseAdminClient();

    const result = await reportsQueries.getReport(db, {
      dateFrom:  searchParams.get("dateFrom")  ?? undefined,
      dateTo:    searchParams.get("dateTo")    ?? undefined,
      territory: searchParams.get("territory") ?? undefined,
      staffId:   searchParams.get("staffId")   ?? undefined,
    });

    return apiSuccess(result);
  },
  PERMISSIONS.REPORTS_VIEW
);
