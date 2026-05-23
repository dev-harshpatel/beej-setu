import { getSupabaseServerClient } from "@/lib/supabase/server";
import { apiSuccess, apiError } from "@/lib/api/auth-guard";

export async function POST() {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return apiError("Logout failed", 500);
  }

  return apiSuccess(null, "Logged out successfully");
}
