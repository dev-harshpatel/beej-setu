import { getSupabaseServerClient } from "@/lib/supabase/server";
import { usersQueries } from "@/lib/database/users.queries";
import { apiSuccess, apiError } from "@/lib/api/auth-guard";
import { serializeAuthUser } from "@/lib/api/serialize-user";

export async function GET() {
  const supabase = await getSupabaseServerClient();

  const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();

  if (error || !supabaseUser) {
    return apiError("Unauthorized", 401);
  }

  const profile = await usersQueries.getByIdWithOrg(supabase, supabaseUser.id).catch(() => null);

  if (!profile || !profile.is_active) {
    return apiError("Account is inactive or not found", 403);
  }

  if (profile.organization.status !== "ACTIVE") {
    return apiError("Organization is not active. Contact support.", 403);
  }

  return apiSuccess(serializeAuthUser(profile, supabaseUser.email!));
}
