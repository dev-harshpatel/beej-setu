import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { serializeOrganization } from "@/lib/api/serialize-user";
import { updateOrganizationSchema } from "@/lib/validators/organization.validators";
import { PERMISSIONS, ROLES } from "@/constants/roles.constants";

// PATCH /api/settings/organization — company name, SUPER_ADMIN only.
// Logo changes go through /api/settings/organization/logo (upload).
export const PATCH = withAuth(
  async (req: NextRequest, _ctx, { profile, orgId }) => {
    if (profile.role !== ROLES.SUPER_ADMIN) {
      return apiError("Only the Super Admin can update organization settings", 403);
    }

    const body = await req.json().catch(() => null);
    const parsed = updateOrganizationSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "Validation failed",
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const db = getSupabaseAdminClient();

    const { data: org, error } = await db
      .from("organizations")
      .update({
        name: parsed.data.name.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orgId)
      .select("id, name, slug, logo_url, status")
      .single();

    if (error) {
      console.error("PATCH /api/settings/organization error:", error);
      return apiError("Failed to update organization", 500);
    }

    return apiSuccess(serializeOrganization(org), "Organization updated");
  },
  PERMISSIONS.SETTINGS_EDIT
);
