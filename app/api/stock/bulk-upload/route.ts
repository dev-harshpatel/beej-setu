import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";

export interface BulkUploadRow {
  crop_name: string;
  variety: string;
  pack_size: string;
  batch_number: string;
  bag_stock: number;
  packet_stock: number;
  movement_date?: string;
  notes?: string;
}

export interface BulkUploadResult {
  row: number;
  crop_name: string;
  variety: string;
  batch_number: string;
  success: boolean;
  message: string;
}

// POST /api/stock/bulk-upload
export const POST = withAuth(
  async (req: NextRequest, _ctx, { profile }) => {
    const body = await req.json().catch(() => null);
    if (!Array.isArray(body?.rows) || body.rows.length === 0) {
      return apiError("rows array is required", 400);
    }

    const rows: BulkUploadRow[] = body.rows;
    if (rows.length > 500) {
      return apiError("Maximum 500 rows per upload", 400);
    }

    const db = getSupabaseAdminClient();

    // Fetch all seed products with their crop names in one query
    const { data: products, error: prodError } = await db
      .from("seed_products")
      .select("id, variety, pack_size, crop:crops(name)")
      .is("deleted_at", null);

    if (prodError) {
      console.error("bulk-upload fetch products error:", prodError);
      return apiError("Failed to fetch seed products", 500);
    }

    // Build lookup map: "crop_name|||variety|||pack_size" → seed_id
    const productMap = new Map<string, string>();
    for (const p of products ?? []) {
      const cropName = (p.crop as { name: string } | null)?.name ?? "";
      const key = `${cropName.trim().toLowerCase()}|||${p.variety.trim().toLowerCase()}|||${p.pack_size.trim().toLowerCase()}`;
      productMap.set(key, p.id);
    }

    const results: BulkUploadResult[] = [];
    let successCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      // Validate required fields
      if (!row.crop_name?.trim()) {
        results.push({ row: rowNum, crop_name: row.crop_name ?? "", variety: row.variety ?? "", batch_number: row.batch_number ?? "", success: false, message: "crop_name is required" });
        continue;
      }
      if (!row.variety?.trim()) {
        results.push({ row: rowNum, crop_name: row.crop_name, variety: row.variety ?? "", batch_number: row.batch_number ?? "", success: false, message: "variety is required" });
        continue;
      }
      if (!row.pack_size?.trim()) {
        results.push({ row: rowNum, crop_name: row.crop_name, variety: row.variety, batch_number: row.batch_number ?? "", success: false, message: "pack_size is required" });
        continue;
      }
      if (!row.batch_number?.trim()) {
        results.push({ row: rowNum, crop_name: row.crop_name, variety: row.variety, batch_number: "", success: false, message: "batch_number is required" });
        continue;
      }

      const key = `${row.crop_name.trim().toLowerCase()}|||${row.variety.trim().toLowerCase()}|||${row.pack_size.trim().toLowerCase()}`;
      const seedId = productMap.get(key);
      if (!seedId) {
        results.push({ row: rowNum, crop_name: row.crop_name, variety: row.variety, batch_number: row.batch_number, success: false, message: `No seed product found for "${row.crop_name} / ${row.variety} / ${row.pack_size}"` });
        continue;
      }

      const bagStock    = Number(row.bag_stock)    || 0;
      const packetStock = Number(row.packet_stock) || 0;

      const { error: insertErr } = await db.from("seed_stock").insert({
        seed_id:         seedId,
        batch_number:    row.batch_number.trim(),
        bag_stock:       bagStock,
        packet_stock:    packetStock,
        last_updated_by: profile.id,
        notes:           row.notes?.trim()         || null,
        movement_date:   row.movement_date?.trim() || null,
      });

      if (insertErr) {
        const msg = insertErr.message.includes("duplicate")
          ? `Batch "${row.batch_number}" already exists for this product`
          : insertErr.message;
        results.push({ row: rowNum, crop_name: row.crop_name, variety: row.variety, batch_number: row.batch_number, success: false, message: msg });
        continue;
      }

      successCount++;
      results.push({ row: rowNum, crop_name: row.crop_name, variety: row.variety, batch_number: row.batch_number, success: true, message: "Created" });
    }

    return apiSuccess(
      { results, successCount, failureCount: rows.length - successCount },
      `${successCount} of ${rows.length} rows imported`,
      successCount > 0 ? 200 : 422
    );
  },
  PERMISSIONS.STOCK_MANAGE
);
