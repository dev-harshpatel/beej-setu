import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { seedsQueries } from "@/lib/database/seeds.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";
import { createSeedSchema } from "@/lib/validators/seeds.validators";

// GET /api/seeds?page=1&pageSize=50&search=&cropId=&variety=&status=
export const GET = withAuth(
  async (req: NextRequest, _ctx, { orgId }) => {
    const { searchParams } = req.nextUrl;
    const db = getSupabaseAdminClient();

    const result = await seedsQueries.getAll(db, orgId, {
      page:             Number(searchParams.get("page")     ?? 1),
      pageSize:         Number(searchParams.get("pageSize") ?? 50),
      search:           searchParams.get("search")          ?? undefined,
      cropId:           searchParams.get("cropId")          ?? undefined,
      variety:          searchParams.get("variety")         ?? undefined,
      status:           searchParams.get("status")          ?? undefined,
      excludeZeroStock: searchParams.get("excludeZeroStock") === "true",
    });

    return apiSuccess(result);
  },
  PERMISSIONS.SEEDS_VIEW
);

// POST /api/seeds
export const POST = withAuth(
  async (req: NextRequest, _ctx, { orgId }) => {
    const body = await req.json().catch(() => null);
    const parsed = createSeedSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const { cropId, variety, packSize, packetsPerBag } = parsed.data;
    const db = getSupabaseAdminClient();

    const seed = await seedsQueries.create(db, orgId, {
      crop_id:        cropId,
      variety:        variety.trim(),
      pack_size:      packSize.trim(),
      packets_per_bag: packetsPerBag,
    });

    return apiSuccess(seed, "Seed product created", 201);
  },
  PERMISSIONS.SEEDS_CREATE
);
