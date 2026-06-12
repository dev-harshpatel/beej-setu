import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { usersQueries } from "@/lib/database/users.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS, type Role } from "@/constants/roles.constants";
import { canManageRole } from "@/lib/api/role-authorization";

export const GET = withAuth(
  async (_req: NextRequest, ctx, auth) => {
    const { id } = await ctx.params;
    const db = getSupabaseAdminClient();
    const user = await usersQueries.getById(db, id, auth.orgId).catch(() => null);

    if (!user) return apiError("User not found", 404);
    return apiSuccess(user);
  },
  PERMISSIONS.USERS_VIEW
);

export const PATCH = withAuth(
  async (req: NextRequest, ctx, auth) => {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const db = getSupabaseAdminClient();

    const target = await usersQueries.getById(db, id, auth.orgId).catch(() => null);
    if (!target) return apiError("User not found", 404);

    if (target.id !== auth.profile.id && !canManageRole(auth.profile.role as Role, target.role as Role)) {
      return apiError("You do not have permission to edit this user", 403);
    }

    const user = await usersQueries.update(db, id, auth.orgId, {
      name:          body.name,
      phone:         body.phone,
      role:          body.role,
      is_active:     body.isActive,
      profile_image: body.profileImage,
      territory:     body.territory,
    });

    return apiSuccess(user, "User updated");
  },
  PERMISSIONS.USERS_EDIT
);

export const DELETE = withAuth(
  async (_req: NextRequest, ctx, auth) => {
    const { id } = await ctx.params;
    const db = getSupabaseAdminClient();

    const target = await usersQueries.getById(db, id, auth.orgId).catch(() => null);
    if (!target) return apiError("User not found", 404);

    if (target.id === auth.profile.id) {
      return apiError("You cannot delete your own account", 400);
    }

    if (!canManageRole(auth.profile.role as Role, target.role as Role)) {
      return apiError("You do not have permission to delete this user", 403);
    }

    await usersQueries.softDelete(db, id, auth.orgId);
    return apiSuccess(null, "User deleted");
  },
  PERMISSIONS.USERS_DELETE
);
