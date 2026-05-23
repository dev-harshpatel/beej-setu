import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { changePasswordSchema } from "@/lib/validators/settings.validators";

export const PATCH = withAuth(async (req: NextRequest, _ctx, { profile }) => {
  const body = await req.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "Validation failed",
      400,
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const { currentPassword, newPassword } = parsed.data;
  const adminClient = getSupabaseAdminClient();

  // Fetch user's email from Supabase auth to verify current password
  const { data: authUser, error: fetchError } =
    await adminClient.auth.admin.getUserById(profile.id);

  if (fetchError || !authUser.user?.email) {
    return apiError("Could not verify identity", 500);
  }

  // Verify current password by attempting sign-in with a plain client
  const verifyClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error: signInError } = await verifyClient.auth.signInWithPassword({
    email: authUser.user.email,
    password: currentPassword,
  });

  if (signInError) {
    return apiError("Validation failed", 400, {
      currentPassword: ["Current password is incorrect"],
    });
  }

  // Update password
  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    profile.id,
    { password: newPassword }
  );

  if (updateError) return apiError("Failed to update password", 500);

  return apiSuccess(null, "Password updated successfully");
});
