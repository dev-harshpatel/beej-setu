import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { seedsQueries } from "@/lib/database/seeds.queries";
import { withAuth, apiSuccess } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";

// GET /api/seeds?page=1&pageSize=50&search=&cropId=&variety=&status=
export const GET = withAuth(
  async (req: NextRequest, _ctx, _auth) => {
    const { searchParams } = req.nextUrl;
    const db = getSupabaseAdminClient();

    const result = await seedsQueries.getAll(db, {
      page:     Number(searchParams.get("page")     ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 50),
      search:   searchParams.get("search")   ?? undefined,
      cropId:   searchParams.get("cropId")   ?? undefined,
      variety:  searchParams.get("variety")  ?? undefined,
      status:   searchParams.get("status")   ?? undefined,
    });

    return apiSuccess(result);
  },
  PERMISSIONS.SEEDS_VIEW
);
