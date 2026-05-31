import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { usersQueries } from "@/lib/database/users.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS, ROLES, type Role } from "@/constants/roles.constants";
import { encryptPassword, decryptPassword } from "@/lib/crypto/password-encryption";

const STAFF_ROLES: Role[] = [ROLES.STAFF, ROLES.DISPATCH_STAFF];

// Returns the decrypted password for a user — only callable by admins, server-side only.
export const GET = withAuth(
  async (_req: NextRequest, ctx, auth) => {
    const { id } = await ctx.params;

    if (auth.profile.id === id) {
      return apiError("Use the Settings page to manage your own password", 400);
    }

    const db = getSupabaseAdminClient();
    const target = await usersQueries.getById(db, id);
    if (!target) return apiError("User not found", 404);

    const allowedTargetRoles: Role[] =
      auth.profile.role === ROLES.SUPER_ADMIN
        ? [ROLES.ADMIN, ROLES.STAFF, ROLES.DISPATCH_STAFF]
        : STAFF_ROLES;

    if (!allowedTargetRoles.includes(target.role as Role)) {
      return apiError("You do not have permission to view this user's password", 403);
    }

    // Fetch encrypted_password directly — excluded from all profile queries intentionally.
    const { data, error } = await db
      .from("profiles")
      .select("encrypted_password")
      .eq("id", id)
      .single();

    if (error || !data) return apiError("Failed to retrieve password", 500);

    let password: string | null = null;
    if (data.encrypted_password) {
      try {
        password = decryptPassword(data.encrypted_password);
      } catch {
        return apiError("Failed to decrypt password", 500);
      }
    }

    return apiSuccess({ password });
  },
  PERMISSIONS.USERS_EDIT
);

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

    await db
      .from("profiles")
      .update({ encrypted_password: encryptPassword(newPassword) })
      .eq("id", id);

    return apiSuccess(null, "Password updated successfully");
  },
  PERMISSIONS.USERS_EDIT
);
