import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";
import { stockQueries, type StockBulkUploadRow } from "@/lib/database/stock.queries";

export type { StockBulkUploadRow as BulkUploadRow, StockBulkUploadResult as BulkUploadResult } from "@/lib/database/stock.queries";

// POST /api/stock/bulk-upload
export const POST = withAuth(
  async (req: NextRequest, _ctx, { profile, orgId }) => {
    const body = await req.json().catch(() => null);
    if (!Array.isArray(body?.rows) || body.rows.length === 0) {
      return apiError("rows array is required", 400);
    }

    const rows: StockBulkUploadRow[] = body.rows;
    if (rows.length > 500) {
      return apiError("Maximum 500 rows per upload", 400);
    }

    const db = getSupabaseAdminClient();
    const { results, successCount } = await stockQueries.bulkInsert(db, orgId, profile.id, rows);

    // Fire-and-forget audit log
    db.from("bulk_upload_logs").insert({
      organization_id: orgId,
      upload_type:   "stock",
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
      `${successCount} of ${rows.length} rows imported`,
      successCount > 0 ? 200 : 422,
    );
  },
  PERMISSIONS.STOCK_MANAGE,
);
