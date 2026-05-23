import { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { usersQueries } from "@/lib/database/users.queries";
import { loginSchema } from "@/lib/validators/auth.validators";
import { apiSuccess, apiError } from "@/lib/api/auth-guard";

function isEmail(value: string): boolean {
  return value.includes("@");
}

async function resolveEmail(identifier: string): Promise<string | null> {
  if (isEmail(identifier)) return identifier;

  // Lookup email by username using admin client (bypasses RLS)
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, username")
    .eq("username", identifier.toLowerCase())
    .single();

  if (error || !data) return null;

  // Get email from auth.users via admin client
  const { data: authUser, error: authError } =
    await admin.auth.admin.getUserById(data.id);

  if (authError || !authUser.user?.email) return null;
  return authUser.user.email;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    console.log("[api/login] body", body);

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const { identifier, password } = parsed.data;
    console.log("[api/login] resolving email for identifier:", identifier);

    const email = await resolveEmail(identifier);
    console.log("[api/login] resolved email:", email);

    if (!email) {
      return apiError("Invalid credentials", 401);
    }

    const supabase = await getSupabaseServerClient();
    console.log("[api/login] calling signInWithPassword");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    console.log("[api/login] signInWithPassword result — error:", error, "user:", data?.user?.id);

    if (error || !data.user) {
      return apiError("Invalid credentials", 401);
    }

    const profile = await usersQueries.getById(supabase, data.user.id).catch((e) => {
      console.error("[api/login] getById error", e);
      return null;
    });
    console.log("[api/login] profile:", profile);

    if (!profile || !profile.is_active) {
      await supabase.auth.signOut();
      return apiError("Account is inactive. Contact your admin.", 403);
    }

    return apiSuccess(
      {
        user: {
          id: profile.id,
          name: profile.name,
          username: profile.username,
          email: data.user.email!,
          phone: profile.phone,
          role: profile.role,
          isActive: profile.is_active,
          profileImage: profile.profile_image,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
        },
        session: {
          accessToken: data.session!.access_token,
          refreshToken: data.session!.refresh_token,
          expiresIn: data.session!.expires_in,
        },
      },
      "Login successful"
    );
  } catch (err) {
    console.error("[api/login] unhandled error", err);
    return apiError("Internal server error", 500);
  }
}
