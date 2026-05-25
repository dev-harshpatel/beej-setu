import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, SeedProductRow, CropRow } from "@/types/database.types";
import type { PaginationParams } from "@/types/common.types";

export type SeedStockSummary = { bag_stock: number; packet_stock: number };

export type SeedProductWithCropRow = SeedProductRow & {
  crop: Pick<CropRow, "id" | "name">;
  stock: SeedStockSummary[];
};

export const seedsQueries = {
  async getAll(
    db: SupabaseClient<Database>,
    params?: PaginationParams & { cropId?: string; variety?: string; status?: string; excludeZeroStock?: boolean }
  ) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = db
      .from("seed_products")
      .select("*, crop:crops(id, name), stock:seed_stock(bag_stock, packet_stock)", { count: "exact" })
      .is("deleted_at", null);

    if (params?.search) {
      query = query.or(
        `variety.ilike.%${params.search}%,pack_size.ilike.%${params.search}%`
      );
    }
    if (params?.cropId) {
      query = query.eq("crop_id", params.cropId);
    }
    if (params?.variety) {
      query = query.eq("variety", params.variety);
    }
    if (params?.status) {
      query = query.eq("status", params.status as SeedProductRow["status"]);
    }

    if (params?.excludeZeroStock) {
      const { data: stockData } = await db
        .from("seed_stock")
        .select("seed_id")
        .or("bag_stock.gt.0,packet_stock.gt.0");
      const seedIdsWithStock = [...new Set((stockData ?? []).map((s) => s.seed_id))];
      query = seedIdsWithStock.length > 0
        ? query.in("id", seedIdsWithStock)
        : query.in("id", ["00000000-0000-0000-0000-000000000000"]);
    }

    const { data, error, count } = await query
      .order("crop_id", { ascending: true })
      .order("variety",  { ascending: true })
      .order("pack_size", { ascending: true })
      .range(from, to);

    if (error) throw error;
    return {
      data: (data ?? []) as SeedProductWithCropRow[],
      total: count ?? 0,
      page,
      pageSize,
    };
  },

  async getById(
    db: SupabaseClient<Database>,
    id: string
  ): Promise<SeedProductWithCropRow | null> {
    const { data, error } = await db
      .from("seed_products")
      .select("*, crop:crops(id, name), stock:seed_stock(bag_stock, packet_stock)")
      .eq("id", id)
      .is("deleted_at", null)
      .single();
    if (error) throw error;
    return data as SeedProductWithCropRow;
  },

  async getAllCrops(db: SupabaseClient<Database>): Promise<CropRow[]> {
    const { data, error } = await db
      .from("crops")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
};
