import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiSuccess, apiError } from "@/lib/api/auth-guard";
import { registerOrganizationSchema } from "@/lib/validators/organization.validators";
import { encryptPassword } from "@/lib/crypto/password-encryption";
import { checkRateLimit } from "@/lib/rate-limit";
import { toSlug } from "@/lib/utils/normalize";
import { ROLES } from "@/constants/roles.constants";
import type { Database } from "@/types/database.types";

// Self-serve company onboarding: creates the organization and its first
// SUPER_ADMIN user in one shot. Public endpoint — aggressively rate-limited.

async function resolveUniqueSlug(db: SupabaseClient<Database>, companyName: string): Promise<string | null> {
  const base = toSlug(companyName) || "company";
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const { data, error } = await db
      .from("organizations")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (error) throw error;
    if (!data) return candidate;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    // Same limiter policy as login: 5 attempts per 15 minutes per IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    const rl = checkRateLimit(`register-org:${ip}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, message: `Too many attempts. Try again in ${rl.retryAfterSeconds} seconds.`, data: null },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = registerOrganizationSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "Validation failed",
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { companyName, adminName, email, username, password } = parsed.data;
    const db = getSupabaseAdminClient();

    // Usernames are globally unique (login is username-based, no org picker)
    const { data: existingUser } = await db
      .from("profiles")
      .select("id")
      .eq("username", username.toLowerCase())
      .maybeSingle();
    if (existingUser) {
      return apiError("Validation failed", 400, {
        username: ["This username is already taken"],
      });
    }

    const slug = await resolveUniqueSlug(db, companyName);
    if (!slug) return apiError("Could not generate a unique identifier for this company name", 422);

    // 1. Organization
    const { data: org, error: orgError } = await db
      .from("organizations")
      .insert({ name: companyName.trim(), slug })
      .select()
      .single();
    if (orgError) {
      console.error("register-organization org insert error:", orgError);
      return apiError("Failed to create organization", 500);
    }

    // Best-effort rollback chain — auth.admin calls and table inserts cannot
    // share a Postgres transaction, so undo manually on any later failure.
    const rollbackOrg = () => db.from("organizations").delete().eq("id", org.id);

    // 2. Auth user
    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authError || !authData.user) {
      await rollbackOrg();
      const message = authError?.message ?? "Failed to create user";
      return apiError(
        message.includes("already registered")
          ? "A user with this email already exists"
          : message,
        400
      );
    }

    let encryptedPassword: string;
    try {
      encryptedPassword = encryptPassword(password);
    } catch (e) {
      await db.auth.admin.deleteUser(authData.user.id);
      await rollbackOrg();
      const msg = e instanceof Error ? e.message : "Encryption configuration error";
      return apiError(msg, 500);
    }

    // 3. Profile — first user of the org is its SUPER_ADMIN
    const { error: profileError } = await db.from("profiles").insert({
      id: authData.user.id,
      organization_id: org.id,
      name: adminName,
      username: username.toLowerCase(),
      role: ROLES.SUPER_ADMIN,
      encrypted_password: encryptedPassword,
    });
    if (profileError) {
      console.error("register-organization profile insert error:", profileError);
      await db.auth.admin.deleteUser(authData.user.id);
      await rollbackOrg();
      return apiError("Failed to create user profile", 500);
    }

    return apiSuccess(
      { organization: { id: org.id, name: org.name, slug: org.slug } },
      "Company registered — you can now sign in",
      201
    );
  } catch (err) {
    console.error("[api/register-organization] unhandled error", err);
    return apiError("Internal server error", 500);
  }
}
