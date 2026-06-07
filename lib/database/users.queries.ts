import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ProfileRow } from "@/types/database.types";
import type { PaginationParams } from "@/types/common.types";

// Never include encrypted_password — it must only be accessed via the dedicated server-side endpoint.
const PROFILE_COLUMNS = "id, name, username, phone, role, is_active, profile_image, territory, created_at, updated_at, deleted_at";

export const usersQueries = {
  async getById(
    db: SupabaseClient<Database>,
    id: string
  ): Promise<ProfileRow | null> {
    const { data, error } = await db
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .single();
    if (error) throw error;
    return data as ProfileRow;
  },

  async getAll(
    db: SupabaseClient<Database>,
    params?: PaginationParams & { role?: string; isActive?: boolean }
  ) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = db
      .from("profiles")
      .select(PROFILE_COLUMNS, { count: "exact" })
      .is("deleted_at", null);

    if (params?.search) {
      query = query.ilike("name", `%${params.search}%`);
    }
    if (params?.role) {
      query = query.eq("role", params.role as ProfileRow["role"]);
    }
    if (typeof params?.isActive === "boolean") {
      query = query.eq("is_active", params.isActive);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data: data ?? [], total: count ?? 0, page, pageSize };
  },

  async update(
    db: SupabaseClient<Database>,
    id: string,
    payload: Database["public"]["Tables"]["profiles"]["Update"]
  ): Promise<ProfileRow> {
    const { data, error } = await db
      .from("profiles")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(PROFILE_COLUMNS)
      .single();
    if (error) throw error;
    return data as ProfileRow;
  },

  async softDelete(db: SupabaseClient<Database>, id: string): Promise<void> {
    const { error } = await db
      .from("profiles")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", id);
    if (error) throw error;
  },

  async bulkSoftDelete(db: SupabaseClient<Database>, ids: string[]): Promise<void> {
    const { error } = await db
      .from("profiles")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .in("id", ids);
    if (error) throw error;
  },
};
