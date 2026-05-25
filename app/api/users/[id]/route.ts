import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { usersQueries } from "@/lib/database/users.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS, ROLES, type Role } from "@/constants/roles.constants";

const STAFF_ROLES: Role[] = [ROLES.STAFF, ROLES.DISPATCH_STAFF];

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
  async (req: NextRequest, ctx, auth) => {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const db = getSupabaseAdminClient();

    const target = await usersQueries.getById(db, id);
    if (!target) return apiError("User not found", 404);

    const allowedTargetRoles: Role[] =
      auth.profile.role === ROLES.SUPER_ADMIN
        ? [ROLES.ADMIN, ROLES.STAFF, ROLES.DISPATCH_STAFF]
        : STAFF_ROLES;

    if (target.id !== auth.profile.id && !allowedTargetRoles.includes(target.role as Role)) {
      return apiError("You do not have permission to edit this user", 403);
    }

    const user = await usersQueries.update(db, id, {
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
