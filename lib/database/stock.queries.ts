import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, SeedStockRow } from "@/types/database.types";
import type { PaginationParams } from "@/types/common.types";

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
    params?: PaginationParams & { cropId?: string; search?: string }
  ) {
    const page     = params?.page     ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const from     = (page - 1) * pageSize;
    const to       = from + pageSize - 1;

    let query = db
      .from("seed_stock")
      .select(STOCK_SELECT, { count: "exact" });

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

  async getById(db: SupabaseClient<Database>, id: string) {
    const { data, error } = await db
      .from("seed_stock")
      .select(STOCK_SELECT)
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as SeedStockWithDetails;
  },

  async create(
    db: SupabaseClient<Database>,
    payload: Database["public"]["Tables"]["seed_stock"]["Insert"]
  ) {
    const { data, error } = await db
      .from("seed_stock")
      .insert(payload)
      .select(STOCK_SELECT)
      .single();
    if (error) throw error;
    return data as SeedStockWithDetails;
  },

  async update(
    db: SupabaseClient<Database>,
    id: string,
    payload: Partial<Database["public"]["Tables"]["seed_stock"]["Insert"]>,
    updatedBy: string
  ) {
    const { data, error } = await db
      .from("seed_stock")
      .update({ ...payload, last_updated_by: updatedBy, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(STOCK_SELECT)
      .single();
    if (error) throw error;
    return data as SeedStockWithDetails;
  },

  async remove(db: SupabaseClient<Database>, id: string) {
    const { error } = await db.from("seed_stock").delete().eq("id", id);
    if (error) throw error;
  },
};
