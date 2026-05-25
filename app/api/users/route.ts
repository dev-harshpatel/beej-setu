import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { usersQueries } from "@/lib/database/users.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS, ROLES } from "@/constants/roles.constants";
import { createUserSchema } from "@/lib/validators/users.validators";

export const GET = withAuth(
  async (req: NextRequest, _ctx, auth) => {
    const { searchParams } = req.nextUrl;
    const db = getSupabaseAdminClient();
    const requestedRole = searchParams.get("role") ?? undefined;

    // Admins cannot see Super Admin users
    if (auth.profile.role === ROLES.ADMIN && requestedRole === ROLES.SUPER_ADMIN) {
      return apiSuccess({ data: [], total: 0, page: 1, pageSize: 50 });
    }

    const result = await usersQueries.getAll(db, {
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 50),
      search: searchParams.get("search") ?? undefined,
      role: requestedRole,
      isActive: searchParams.has("isActive")
        ? searchParams.get("isActive") === "true"
        : undefined,
    });

    return apiSuccess(result);
  },
  PERMISSIONS.USERS_VIEW
);

export const POST = withAuth(
  async (req: NextRequest, _ctx, auth) => {
    const body = await req.json().catch(() => null);
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation failed",
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { name, email, username, password, role, territory } = parsed.data;

    // Admins cannot create Super Admin users
    if (auth.profile.role === ROLES.ADMIN && role === ROLES.SUPER_ADMIN) {
      return apiError("You do not have permission to create Super Admin users", 403);
    }

    const adminClient = getSupabaseAdminClient();

    // Check if username already exists
    const { data: existingUser } = await adminClient
      .from("profiles")
      .select("id")
      .eq("username", username.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      return apiError("Validation failed", 400, {
        username: ["This username is already taken"],
      });
    }

    // Create Supabase auth user
    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      const message = authError?.message ?? "Failed to create user";
      return apiError(
        message.includes("already registered")
          ? "A user with this email already exists"
          : message,
        400
      );
    }

    // Insert profile row
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .insert({
        id: authData.user.id,
        name,
        username: username.toLowerCase(),
        role,
        ...(territory ? { territory } : {}),
      })
      .select()
      .single();

    if (profileError) {
      // Rollback: delete the orphaned auth user
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return apiError("Failed to create user profile", 500);
    }

    return apiSuccess(profile, "User created successfully", 201);
  },
  PERMISSIONS.USERS_CREATE
);
