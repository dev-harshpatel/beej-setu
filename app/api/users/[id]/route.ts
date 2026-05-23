import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { usersQueries } from "@/lib/database/users.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";

export const GET = withAuth(
  async (_req: NextRequest, ctx, _auth) => {
    const { id } = await ctx.params;
    const db = getSupabaseAdminClient();
    const user = await usersQueries.getById(db, id);

    if (!user) return apiError("User not found", 404);
    return apiSuccess(user);
  },
  PERMISSIONS.USERS_VIEW
);

export const PATCH = withAuth(
  async (req: NextRequest, ctx, _auth) => {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const db = getSupabaseAdminClient();

    const user = await usersQueries.update(db, id, {
      name: body.name,
      phone: body.phone,
      role: body.role,
      is_active: body.isActive,
      profile_image: body.profileImage,
    });

    return apiSuccess(user, "User updated");
  },
  PERMISSIONS.USERS_EDIT
);
