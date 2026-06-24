import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { usersQueries } from "@/lib/database/users.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS, type Role } from "@/constants/roles.constants";
import { canManageRole } from "@/lib/api/role-authorization";

export const POST = withAuth(
  async (req: NextRequest, _ctx, auth) => {
    const body = await req.json().catch(() => ({}));
    const ids: unknown = body.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return apiError("ids must be a non-empty array", 400);
    }

    const db = getSupabaseAdminClient();

    // Verify none of the IDs is the current user and all are manageable roles
    for (const id of ids as string[]) {
      if (id === auth.profile.id) {
        return apiError("You cannot delete your own account", 400);
      }
      const target = await usersQueries.getById(db, id, auth.orgId).catch(() => null);
      if (target && !canManageRole(auth.profile.role as Role, target.role as Role)) {
        return apiError(`You do not have permission to delete user ${target.name}`, 403);
      }
    }

    await usersQueries.bulkSoftDelete(db, ids as string[], auth.orgId);
    await Promise.all((ids as string[]).map((id) => db.auth.admin.deleteUser(id)));
    return apiSuccess(null, `${ids.length} user(s) deleted`);
  },
  PERMISSIONS.USERS_DELETE
);
