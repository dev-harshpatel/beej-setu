import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { seedsQueries } from "@/lib/database/seeds.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";
import { updateSeedSchema } from "@/lib/validators/seeds.validators";

// GET /api/seeds/:id
export const GET = withAuth(
  async (_req: NextRequest, ctx, { orgId }) => {
    const { id } = await ctx.params;
    const db = getSupabaseAdminClient();
    const product = await seedsQueries.getById(db, id, orgId).catch(() => null);

    if (!product) return apiError("Seed product not found", 404);
    return apiSuccess(product);
  },
  PERMISSIONS.SEEDS_VIEW
);

// PATCH /api/seeds/:id
export const PATCH = withAuth(
  async (req: NextRequest, ctx, { orgId }) => {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const parsed = updateSeedSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const db = getSupabaseAdminClient();
    const existing = await seedsQueries.getById(db, id, orgId).catch(() => null);
    if (!existing) return apiError("Seed product not found", 404);

    const { cropId, variety, packSize, packetsPerBag, status } = parsed.data;
    const seed = await seedsQueries.update(db, id, orgId, {
      ...(cropId         !== undefined && { crop_id: cropId }),
      ...(variety        !== undefined && { variety: variety.trim() }),
      ...(packSize       !== undefined && { pack_size: packSize.trim() }),
      ...(packetsPerBag  !== undefined && { packets_per_bag: packetsPerBag }),
      ...(status         !== undefined && { status }),
    });

    return apiSuccess(seed, "Seed product updated");
  },
  PERMISSIONS.SEEDS_EDIT
);

// DELETE /api/seeds/:id
export const DELETE = withAuth(
  async (_req: NextRequest, ctx, { orgId }) => {
    const { id } = await ctx.params;
    const db = getSupabaseAdminClient();

    const existing = await seedsQueries.getById(db, id, orgId).catch(() => null);
    if (!existing) return apiError("Seed product not found", 404);

    await seedsQueries.delete(db, id, orgId);
    return apiSuccess(null, "Seed product deleted");
  },
  PERMISSIONS.SEEDS_DELETE
);
