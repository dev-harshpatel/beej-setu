import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DealerRow } from "@/types/database.types";
import type { PaginationParams } from "@/types/common.types";

export type DealerWithStaffRow = DealerRow & {
  staff: { id: string; name: string; username: string } | null;
};

export const dealersQueries = {
  async getById(
    db: SupabaseClient<Database>,
    id: string
  ): Promise<DealerWithStaffRow | null> {
    const { data, error } = await db
      .from("dealers")
      .select("*, staff:profiles(id, name, username)")
      .eq("id", id)
      .is("deleted_at", null)
      .single();
    if (error) throw error;
    return data as DealerWithStaffRow;
  },

  async getAll(
    db: SupabaseClient<Database>,
    params?: PaginationParams & { status?: string; staffId?: string; territory?: string }
  ) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = db
      .from("dealers")
      .select("*, staff:profiles(id, name, username)", { count: "exact" })
      .is("deleted_at", null);

    if (params?.search) {
      query = query.or(
        `name.ilike.%${params.search}%,contact.ilike.%${params.search}%,territory.ilike.%${params.search}%`
      );
    }
    if (params?.status) {
      query = query.eq("status", params.status as DealerRow["status"]);
    }
    if (params?.staffId) {
      query = query.eq("staff_id", params.staffId);
    }
    if (params?.territory) {
      query = query.ilike("territory", `%${params.territory}%`);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;
    return {
      data: (data ?? []) as DealerWithStaffRow[],
      total: count ?? 0,
      page,
      pageSize,
    };
  },

  async create(
    db: SupabaseClient<Database>,
    payload: Database["public"]["Tables"]["dealers"]["Insert"]
  ): Promise<DealerWithStaffRow> {
    const { data, error } = await db
      .from("dealers")
      .insert(payload)
      .select("*, staff:profiles(id, name, username)")
      .single();
    if (error) throw error;
    return data as DealerWithStaffRow;
  },

  async update(
    db: SupabaseClient<Database>,
    id: string,
    payload: Database["public"]["Tables"]["dealers"]["Update"]
  ): Promise<DealerWithStaffRow> {
    const { data, error } = await db
      .from("dealers")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*, staff:profiles(id, name, username)")
      .single();
    if (error) throw error;
    return data as DealerWithStaffRow;
  },

  async softDelete(db: SupabaseClient<Database>, id: string): Promise<void> {
    const { error } = await db
      .from("dealers")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },
};
