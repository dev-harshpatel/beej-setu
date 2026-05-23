import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { usersQueries } from "@/lib/database/users.queries";
import { ROLE_PERMISSIONS, type Permission } from "@/constants/roles.constants";

/**
 * Call at the top of any server-side page that requires a specific permission.
 * Renders the Next.js 404 page for unauthenticated or unauthorized users.
 */
export async function requirePermission(permission: Permission) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) notFound();

  const profile = await usersQueries.getById(supabase, user.id);

  if (!profile || !profile.is_active) notFound();

  const permissions = ROLE_PERMISSIONS[profile.role] ?? [];
  if (!permissions.includes(permission)) notFound();

  return profile;
}
