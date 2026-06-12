import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";
import { dealersQueries, type DealerBulkUploadRow } from "@/lib/database/dealers.queries";

export type { DealerBulkUploadRow, DealerBulkUploadResult } from "@/lib/database/dealers.queries";

// POST /api/dealers/bulk-upload
export const POST = withAuth(
  async (req: NextRequest, _ctx, { profile, orgId }) => {
    const body = await req.json().catch(() => null);
    if (!Array.isArray(body?.rows) || body.rows.length === 0) {
      return apiError("rows array is required", 400);
    }

    const rows: DealerBulkUploadRow[] = body.rows;
    if (rows.length > 500) {
      return apiError("Maximum 500 rows per upload", 400);
    }

    const db = getSupabaseAdminClient();
    const { results, successCount } = await dealersQueries.bulkInsert(db, orgId, rows);

    // Fire-and-forget audit log
    db.from("bulk_upload_logs").insert({
      organization_id: orgId,
      upload_type:   "dealers",
      uploaded_by:   profile.id,
      total_rows:    rows.length,
      success_count: successCount,
      failure_count: rows.length - successCount,
      results,
    }).then(({ error }) => {
      if (error) console.error("bulk_upload_logs insert error:", error.message);
    });

    return apiSuccess(
      { results, successCount, failureCount: rows.length - successCount },
      `${successCount} of ${rows.length} dealers imported`,
      successCount > 0 ? 200 : 422,
    );
  },
  PERMISSIONS.DEALERS_CREATE,
);
