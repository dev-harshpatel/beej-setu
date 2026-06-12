import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, SeedStockRow } from "@/types/database.types";
import type { PaginationParams } from "@/types/common.types";
import { toBatchCode } from "@/lib/utils/normalize";

export interface StockBulkUploadRow {
  crop_name: string;
  variety: string;
  pack_size: string;
  batch_number: string;
  bag_stock: number;
  packet_stock: number;
  movement_date?: string;
  notes?: string;
}

// Type alias (not interface) so it satisfies the Json index signature of bulk_upload_logs.results
export type StockBulkUploadResult = {
  row: number;
  crop_name: string;
  variety: string;
  batch_number: string;
  success: boolean;
  message: string;
};

export type SeedStockWithDetails = SeedStockRow & {
  seed_product: {
    id: string;
    variety: string;
    pack_size: string;
    packets_per_bag: number;
    crop_id: string;
    crop: { id: string; name: string };
  };
  updater: { id: string; name: string } | null;
};

const STOCK_SELECT = `
  *,
  seed_product:seed_products!inner(id, variety, pack_size, packets_per_bag, crop_id, crop:crops!inner(id, name)),
  updater:profiles!seed_stock_last_updated_by_fkey(id, name)
`;

export const stockQueries = {
  async getAll(
    db: SupabaseClient<Database>,
    orgId: string,
    params?: PaginationParams & { cropId?: string; search?: string }
  ) {
    const page     = params?.page     ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const from     = (page - 1) * pageSize;
    const to       = from + pageSize - 1;

    let query = db
      .from("seed_stock")
      .select(STOCK_SELECT, { count: "exact" })
      .eq("organization_id", orgId);

    if (params?.search) {
      query = query.ilike("seed_products.variety", `%${params.search}%`);
    }
    if (params?.cropId) {
      query = query.eq("seed_products.crop_id", params.cropId);
    }

    const { data, error, count } = await query
      .order("seed_id", { ascending: true })
      .order("batch_number", { ascending: true })
      .range(from, to);

    if (error) throw error;
    return { data: (data ?? []) as SeedStockWithDetails[], total: count ?? 0, page, pageSize };
  },

  async getById(db: SupabaseClient<Database>, id: string, orgId: string) {
    const { data, error } = await db
      .from("seed_stock")
      .select(STOCK_SELECT)
      .eq("id", id)
      .eq("organization_id", orgId)
      .single();
    if (error) throw error;
    return data as SeedStockWithDetails;
  },

  async create(
    db: SupabaseClient<Database>,
    orgId: string,
    payload: Omit<Database["public"]["Tables"]["seed_stock"]["Insert"], "organization_id">
  ) {
    const { data, error } = await db
      .from("seed_stock")
      .insert({ ...payload, organization_id: orgId })
      .select(STOCK_SELECT)
      .single();
    if (error) throw error;
    return data as SeedStockWithDetails;
  },

  async update(
    db: SupabaseClient<Database>,
    id: string,
    orgId: string,
    payload: Partial<Omit<Database["public"]["Tables"]["seed_stock"]["Insert"], "organization_id">>,
    updatedBy: string
  ) {
    const { data, error } = await db
      .from("seed_stock")
      .update({ ...payload, last_updated_by: updatedBy, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", orgId)
      .select(STOCK_SELECT)
      .single();
    if (error) throw error;
    return data as SeedStockWithDetails;
  },

  async remove(db: SupabaseClient<Database>, id: string, orgId: string) {
    const { error } = await db
      .from("seed_stock")
      .delete()
      .eq("id", id)
      .eq("organization_id", orgId);
    if (error) throw error;
  },

  // Row-by-row insert with per-row error collection.
  // Requires a product lookup; a bad row fails only that row, not the whole batch.
  async bulkInsert(
    db: SupabaseClient<Database>,
    orgId: string,
    userId: string,
    rows: StockBulkUploadRow[],
  ): Promise<{ results: StockBulkUploadResult[]; successCount: number }> {
    // One fetch for all seed products — build a lookup map crop|||variety|||pack_size → id
    const { data: products, error: prodError } = await db
      .from("seed_products")
      .select("id, variety, pack_size, crop:crops(name)")
      .eq("organization_id", orgId)
      .is("deleted_at", null);

    if (prodError) throw prodError;

    const productMap = new Map<string, string>();
    for (const p of products ?? []) {
      const cropName = (p.crop as { name: string } | null)?.name ?? "";
      const key = `${cropName.trim().toLowerCase()}|||${p.variety.trim().toLowerCase()}|||${p.pack_size.trim().toLowerCase()}`;
      productMap.set(key, p.id);
    }

    const results: StockBulkUploadResult[] = [];
    let successCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row    = rows[i];
      const rowNum = i + 1;

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

      const key    = `${row.crop_name.trim().toLowerCase()}|||${row.variety.trim().toLowerCase()}|||${row.pack_size.trim().toLowerCase()}`;
      const seedId = productMap.get(key);
      if (!seedId) {
        results.push({ row: rowNum, crop_name: row.crop_name, variety: row.variety, batch_number: row.batch_number, success: false, message: `No seed product found for "${row.crop_name} / ${row.variety} / ${row.pack_size}"` });
        continue;
      }

      const { error: insertErr } = await db.from("seed_stock").insert({
        organization_id: orgId,
        seed_id:         seedId,
        batch_number:    toBatchCode(row.batch_number),
        bag_stock:       Number(row.bag_stock)    || 0,
        packet_stock:    Number(row.packet_stock) || 0,
        last_updated_by: userId,
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

    return { results, successCount };
  },
};
