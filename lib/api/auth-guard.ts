import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { usersQueries } from "@/lib/database/users.queries";
import type { ProfileRow } from "@/types/database.types";
import type { Permission } from "@/constants/roles.constants";
import { ROLE_PERMISSIONS } from "@/constants/roles.constants";
import type { ApiResponse } from "@/types/common.types";

export interface AuthGuardResult {
  profile: ProfileRow;
}

export type RouteHandler<T = unknown> = (
  req: NextRequest,
  context: { params: Promise<Record<string, string>> },
  auth: AuthGuardResult
) => Promise<NextResponse<ApiResponse<T>>>;

export function withAuth<T = unknown>(
  handler: RouteHandler<T>,
  requiredPermission?: Permission
) {
  return async (
    req: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: "Unauthorized", data: null },
        { status: 401 }
      );
    }

    const profile = await usersQueries.getById(supabase, user.id);

    if (!profile || !profile.is_active) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: "Account is inactive or not found", data: null },
        { status: 403 }
      );
    }

    if (requiredPermission) {
      const permissions = ROLE_PERMISSIONS[profile.role] ?? [];
      if (!permissions.includes(requiredPermission)) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, message: "Forbidden", data: null },
          { status: 403 }
        );
      }
    }

    return handler(req, context, { profile });
  };
}

export function apiError(
  message: string,
  status: number,
  errors?: Record<string, string[]>
) {
  return NextResponse.json<ApiResponse<null>>(
    { success: false, message, data: null, ...(errors && { errors }) },
    { status }
  );
}

export function apiSuccess<T>(data: T, message = "OK", status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    { success: true, message, data },
    { status }
  );
}
