import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { usersQueries } from "@/lib/database/users.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS, ROLES, type Role } from "@/constants/roles.constants";

const STAFF_ROLES: Role[] = [ROLES.STAFF, ROLES.DISPATCH_STAFF];

export const PATCH = withAuth(
  async (req: NextRequest, ctx, auth) => {
    const { id } = await ctx.params;

    if (auth.profile.id === id) {
      return apiError("Use the Settings page to change your own password", 400);
    }

    const body = await req.json().catch(() => ({}));
    const { newPassword } = body;

    if (!newPassword || typeof newPassword !== "string") {
      return apiError("New password is required", 400);
    }
    if (newPassword.length < 6 || newPassword.length > 72) {
      return apiError("Password must be between 6 and 72 characters", 400);
    }

    const db = getSupabaseAdminClient();
    const target = await usersQueries.getById(db, id);

    if (!target) return apiError("User not found", 404);

    const allowedTargetRoles: Role[] =
      auth.profile.role === ROLES.SUPER_ADMIN
        ? [ROLES.ADMIN, ROLES.STAFF, ROLES.DISPATCH_STAFF]
        : STAFF_ROLES;

    if (!allowedTargetRoles.includes(target.role as Role)) {
      return apiError("You do not have permission to change this user's password", 403);
    }

    const { error } = await db.auth.admin.updateUserById(id, { password: newPassword });
    if (error) return apiError("Failed to update password", 500);

    return apiSuccess(null, "Password updated successfully");
  },
  PERMISSIONS.USERS_EDIT
);
