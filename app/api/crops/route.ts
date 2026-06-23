import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { seedsQueries } from "@/lib/database/seeds.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";
import { toTitleCase } from "@/lib/utils/normalize";

// GET /api/crops — full list, no pagination (20 crops max)
export const GET = withAuth(
  async (_req, _ctx, { orgId }) => {
    const db = getSupabaseAdminClient();
    const crops = await seedsQueries.getAllCrops(db, orgId);
    return apiSuccess(crops);
  },
  PERMISSIONS.SEEDS_VIEW
);

// POST /api/crops
export const POST = withAuth(
  async (req: NextRequest, _ctx, { orgId }) => {
    const body = await req.json().catch(() => null);
    const raw  = body?.name;
    if (!raw || typeof raw !== "string" || !raw.trim()) {
      return apiError("Crop name is required", 400);
    }

    const name = toTitleCase(raw.trim());
    if (name.length < 2)  return apiError("Crop name must be at least 2 characters", 400);
    if (name.length > 100) return apiError("Crop name is too long", 400);

    const db   = getSupabaseAdminClient();
    const crop = await seedsQueries.createCrop(db, orgId, name);
    return apiSuccess(crop, "Crop created", 201);
  },
  PERMISSIONS.SEEDS_CREATE
);
