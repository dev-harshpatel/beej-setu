import { getSupabaseServerClient } from "@/lib/supabase/server";
import { usersQueries } from "@/lib/database/users.queries";
import { apiSuccess, apiError } from "@/lib/api/auth-guard";

export async function GET() {
  const supabase = await getSupabaseServerClient();

  const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();

  if (error || !supabaseUser) {
    return apiError("Unauthorized", 401);
  }

  const profile = await usersQueries.getById(supabase, supabaseUser.id).catch(() => null);

  if (!profile || !profile.is_active) {
    return apiError("Account is inactive or not found", 403);
  }

  return apiSuccess({
    id: profile.id,
    name: profile.name,
    username: profile.username,
    email: supabaseUser.email!,
    phone: profile.phone,
    role: profile.role,
    isActive: profile.is_active,
    profileImage: profile.profile_image,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  });
}
