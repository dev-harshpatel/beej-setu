import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";

export interface DealerBulkUploadRow {
  name: string;
  contact?: string;
  territory?: string;
  default_transport?: string;
  notes?: string;
}

export interface DealerBulkUploadResult {
  row: number;
  name: string;
  contact?: string;
  success: boolean;
  message: string;
}

// POST /api/dealers/bulk-upload
export const POST = withAuth(
  async (req: NextRequest, _ctx, { profile }) => {
    const body = await req.json().catch(() => null);
    if (!Array.isArray(body?.rows) || body.rows.length === 0) {
      return apiError("rows array is required", 400);
    }

    const rows: DealerBulkUploadRow[] = body.rows;
    if (rows.length > 500) {
      return apiError("Maximum 500 rows per upload", 400);
    }

    const db = getSupabaseAdminClient();
    const results: DealerBulkUploadResult[] = [];
    let successCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      if (!row.name?.trim()) {
        results.push({ row: rowNum, name: row.name ?? "", contact: row.contact ?? "", success: false, message: "name is required" });
        continue;
      }

      const { error: insertErr } = await db.from("dealers").insert({
        name:              row.name.trim(),
        contact:           row.contact?.trim()          || null,
        territory:         row.territory?.trim()          || null,
        default_transport: row.default_transport?.trim()  || null,
        notes:             row.notes?.trim()              || null,
      });

      if (insertErr) {
        results.push({ row: rowNum, name: row.name, contact: row.contact, success: false, message: insertErr.message });
        continue;
      }

      successCount++;
      results.push({ row: rowNum, name: row.name, contact: row.contact, success: true, message: "Created" });
    }

    // Fire-and-forget audit log — types pending migration 021
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any).from("bulk_upload_logs").insert({
      upload_type:   "dealers",
      uploaded_by:   profile.id,
      total_rows:    rows.length,
      success_count: successCount,
      failure_count: rows.length - successCount,
      results,
    }).then(({ error }: { error: { message: string } | null }) => {
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
