import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { serializeOrganization } from "@/lib/api/serialize-user";
import { PERMISSIONS, ROLES } from "@/constants/roles.constants";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const BUCKET = "org-logos";
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // matches the bucket's file_size_limit
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

// Each org's logos live under <orgId>/ — remove everything there so
// replaced/deleted logos don't pile up as orphaned objects.
async function removeExistingLogos(db: SupabaseClient<Database>, orgId: string) {
  const { data: files } = await db.storage.from(BUCKET).list(orgId);
  if (files && files.length > 0) {
    await db.storage.from(BUCKET).remove(files.map((f) => `${orgId}/${f.name}`));
  }
}

async function saveLogoUrl(db: SupabaseClient<Database>, orgId: string, logoUrl: string | null) {
  return db
    .from("organizations")
    .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
    .eq("id", orgId)
    .select("id, name, slug, logo_url, status")
    .single();
}

// POST /api/settings/organization/logo — multipart upload, SUPER_ADMIN only
export const POST = withAuth(
  async (req: NextRequest, _ctx, { profile, orgId }) => {
    if (profile.role !== ROLES.SUPER_ADMIN) {
      return apiError("Only the Super Admin can update the organization logo", 403);
    }

    const formData = await req.formData().catch(() => null);
    const file = formData?.get("file");
    if (!(file instanceof File)) {
      return apiError("file is required", 400);
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return apiError("Logo must be a PNG, JPEG, or WebP image", 422);
    }
    if (file.size > MAX_SIZE_BYTES) {
      return apiError("Logo must be 2 MB or smaller", 422);
    }

    const db = getSupabaseAdminClient();

    await removeExistingLogos(db, orgId);

    // Timestamped filename → new URL on every upload, so no stale
    // browser/CDN cache after a logo change.
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${orgId}/logo-${Date.now()}.${ext}`;

    const { error: uploadError } = await db.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type });
    if (uploadError) {
      console.error("logo upload error:", uploadError);
      return apiError("Failed to upload logo", 500);
    }

    const { data: { publicUrl } } = db.storage.from(BUCKET).getPublicUrl(path);

    const { data: org, error } = await saveLogoUrl(db, orgId, publicUrl);
    if (error) {
      console.error("logo url save error:", error);
      return apiError("Failed to save logo", 500);
    }

    return apiSuccess(serializeOrganization(org), "Logo updated");
  },
  PERMISSIONS.SETTINGS_EDIT
);

// DELETE /api/settings/organization/logo — remove logo, SUPER_ADMIN only
export const DELETE = withAuth(
  async (_req: NextRequest, _ctx, { profile, orgId }) => {
    if (profile.role !== ROLES.SUPER_ADMIN) {
      return apiError("Only the Super Admin can update the organization logo", 403);
    }

    const db = getSupabaseAdminClient();

    await removeExistingLogos(db, orgId);

    const { data: org, error } = await saveLogoUrl(db, orgId, null);
    if (error) {
      console.error("logo removal error:", error);
      return apiError("Failed to remove logo", 500);
    }

    return apiSuccess(serializeOrganization(org), "Logo removed");
  },
  PERMISSIONS.SETTINGS_EDIT
);
