import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { updateProfileSchema } from "@/lib/validators/settings.validators";

export const PATCH = withAuth(async (req: NextRequest, _ctx, { profile }) => {
  const body = await req.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "Validation failed",
      400,
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const { email, username } = parsed.data;
  const adminClient = getSupabaseAdminClient();

  if (username && username !== profile.username) {
    const { data: existing } = await adminClient
      .from("profiles")
      .select("id")
      .eq("username", username.toLowerCase())
      .neq("id", profile.id)
      .maybeSingle();

    if (existing) {
      return apiError("Validation failed", 400, {
        username: ["This username is already taken"],
      });
    }

    const { error } = await adminClient
      .from("profiles")
      .update({ username: username.toLowerCase(), updated_at: new Date().toISOString() })
      .eq("id", profile.id);

    if (error) return apiError("Failed to update username", 500);
  }

  if (email && email !== "") {
    const { error } = await adminClient.auth.admin.updateUserById(profile.id, {
      email,
    });

    if (error) {
      const msg = error.message.includes("already registered")
        ? "A user with this email already exists"
        : "Failed to update email";
      return apiError(msg, 400);
    }
  }

  const { data: updated } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", profile.id)
    .single();

  return apiSuccess(
    { profile: updated, email: email || null },
    "Profile updated successfully"
  );
});
