import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, OrderRow } from "@/types/database.types";
import type { PaginationParams } from "@/types/common.types";
import type { OrderStatusValue } from "@/constants/order-status.constants";

const ORDER_SELECT = `
  *,
  dealer:dealers(*),
  staff:profiles(*),
  items:order_items(*, seed:seed_products(*, crops(name)))
`;

export const ordersQueries = {
  async getById(db: SupabaseClient<Database>, id: string) {
    const { data, error } = await db
      .from("orders")
      .select(ORDER_SELECT)
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async getAll(
    db: SupabaseClient<Database>,
    params?: PaginationParams & { status?: string; statuses?: string[]; dealerId?: string; staffId?: string; dateFrom?: string; dateTo?: string }
  ) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = db
      .from("orders")
      .select(ORDER_SELECT, { count: "exact" });

    if (params?.search) {
      query = query.ilike("order_number", `%${params.search}%`);
    }
    if (params?.statuses && params.statuses.length > 0) {
      query = query.in("status", params.statuses as OrderRow["status"][]);
    } else if (params?.status) {
      query = query.eq("status", params.status as OrderRow["status"]);
    }
    if (params?.dealerId) {
      query = query.eq("dealer_id", params.dealerId);
    }
    if (params?.staffId) {
      query = query.eq("staff_id", params.staffId);
    }
    if (params?.dateFrom) {
      query = query.gte("created_at", params.dateFrom);
    }
    if (params?.dateTo) {
      query = query.lte("created_at", params.dateTo + "T23:59:59.999Z");
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data: data ?? [], total: count ?? 0, page, pageSize };
  },

  async create(
    db: SupabaseClient<Database>,
    order: Database["public"]["Tables"]["orders"]["Insert"],
    items: Database["public"]["Tables"]["order_items"]["Insert"][]
  ) {
    const { data: orderData, error: orderError } = await db
      .from("orders")
      .insert(order)
      .select()
      .single();
    if (orderError) throw orderError;

    const itemsWithOrderId = items.map((item) => ({
      ...item,
      order_id: orderData.id,
    }));

    const { error: itemsError } = await db
      .from("order_items")
      .insert(itemsWithOrderId);
    if (itemsError) throw itemsError;

    return this.getById(db, orderData.id);
  },

  async updateStatus(
    db: SupabaseClient<Database>,
    id: string,
    status: OrderRow["status"]
  ) {
    const { data, error } = await db
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(ORDER_SELECT)
      .single();
    if (error) throw error;
    return data;
  },

  async update(
    db: SupabaseClient<Database>,
    id: string,
    payload: Database["public"]["Tables"]["orders"]["Update"]
  ) {
    const { data, error } = await db
      .from("orders")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(ORDER_SELECT)
      .single();
    if (error) throw error;
    return data;
  },

  async updateItems(
    db: SupabaseClient<Database>,
    items: { id: string; quantity: number; unit: "Bag" | "Packet" | "Box" }[]
  ) {
    await Promise.all(
      items.map(({ id, quantity, unit }) =>
        db.from("order_items").update({ quantity, unit }).eq("id", id).throwOnError()
      )
    );
  },

  // Legacy alias kept so any other callers don't break during migration.
  async confirmWithStockDeduction(db: SupabaseClient<Database>, id: string) {
    return this.approveWithStockDeduction(db, id, "APPROVED");
  },

  async approveWithStockDeduction(
    db: SupabaseClient<Database>,
    id: string,
    status: OrderStatusValue,
  ) {
    const { error } = await db.rpc("approve_order", {
      p_order_id: id,
      p_status: status,
    });
    if (error) throw error;
    return this.getById(db, id);
  },
};
