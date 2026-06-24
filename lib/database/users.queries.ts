import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, OrganizationRow, ProfileRow } from "@/types/database.types";
import type { PaginationParams } from "@/types/common.types";

// Never include encrypted_password — it must only be accessed via the dedicated server-side endpoint.
const PROFILE_COLUMNS = "id, organization_id, name, username, phone, role, is_active, profile_image, territory, created_at, updated_at, deleted_at";

export type ProfileOrganization = Pick<
  OrganizationRow,
  "id" | "name" | "slug" | "logo_url" | "address" | "gst_number" | "phone" | "email" | "seed_licence_number" | "status"
>;

export type ProfileWithOrgRow = ProfileRow & {
  organization: ProfileOrganization;
};

export const usersQueries = {
  async getById(
    db: SupabaseClient<Database>,
    id: string,
    orgId: string
  ): Promise<ProfileRow | null> {
    const { data, error } = await db
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", id)
      .eq("organization_id", orgId)
      .is("deleted_at", null)
      .single();
    if (error) throw error;
    return data as ProfileRow;
  },

  // Used wherever the caller's org is not yet known (auth guard, login, /me) —
  // this is the query that DISCOVERS the org, so it takes no orgId filter.
  async getByIdWithOrg(
    db: SupabaseClient<Database>,
    id: string
  ): Promise<ProfileWithOrgRow | null> {
    const { data, error } = await db
      .from("profiles")
      .select(`${PROFILE_COLUMNS}, organization:organizations(id, name, slug, logo_url, address, gst_number, phone, email, seed_licence_number, status)`)
      .eq("id", id)
      .is("deleted_at", null)
      .single();
    if (error) throw error;
    return data as unknown as ProfileWithOrgRow;
  },

  async getAll(
    db: SupabaseClient<Database>,
    orgId: string,
    params?: PaginationParams & { role?: string; isActive?: boolean }
  ) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = db
      .from("profiles")
      .select(PROFILE_COLUMNS, { count: "exact" })
      .eq("organization_id", orgId)
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
    orgId: string,
    payload: Database["public"]["Tables"]["profiles"]["Update"]
  ): Promise<ProfileRow> {
    const { data, error } = await db
      .from("profiles")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", orgId)
      .select(PROFILE_COLUMNS)
      .single();
    if (error) throw error;
    return data as ProfileRow;
  },

  async softDelete(db: SupabaseClient<Database>, id: string, orgId: string): Promise<void> {
    const { error } = await db
      .from("profiles")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", id)
      .eq("organization_id", orgId);
    if (error) throw error;
  },

  async bulkSoftDelete(db: SupabaseClient<Database>, ids: string[], orgId: string): Promise<void> {
    const { error } = await db
      .from("profiles")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .in("id", ids)
      .eq("organization_id", orgId);
    if (error) throw error;
  },
};
