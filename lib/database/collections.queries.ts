import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, CollectionRow } from "@/types/database.types";

export type CollectionWithRelations = CollectionRow & {
  dealer: { id: string; name: string } | null;
  staff:  { id: string; name: string } | null;
};

const COLLECTION_SELECT = `
  *,
  dealer:dealers(id, name),
  staff:profiles(id, name)
`;

export const collectionsQueries = {
  async getAll(
    db: SupabaseClient<Database>,
    params?: { staffId?: string; dealerId?: string; dateFrom?: string; dateTo?: string }
  ): Promise<CollectionWithRelations[]> {
    let query = db
      .from("collections")
      .select(COLLECTION_SELECT)
      .order("collection_date", { ascending: false })
      .order("created_at",      { ascending: false });

    if (params?.staffId)   query = query.eq("staff_id",        params.staffId);
    if (params?.dealerId)  query = query.eq("dealer_id",       params.dealerId);
    if (params?.dateFrom)  query = query.gte("collection_date", params.dateFrom);
    if (params?.dateTo)    query = query.lte("collection_date", params.dateTo);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as CollectionWithRelations[];
  },

  async create(
    db: SupabaseClient<Database>,
    payload: Database["public"]["Tables"]["collections"]["Insert"]
  ): Promise<CollectionWithRelations> {
    const { data, error } = await db
      .from("collections")
      .insert(payload)
      .select(COLLECTION_SELECT)
      .single();
    if (error) throw error;
    return data as CollectionWithRelations;
  },

  async update(
    db: SupabaseClient<Database>,
    id: string,
    payload: Database["public"]["Tables"]["collections"]["Update"]
  ): Promise<CollectionWithRelations> {
    const { data, error } = await db
      .from("collections")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(COLLECTION_SELECT)
      .single();
    if (error) throw error;
    return data as CollectionWithRelations;
  },

  async delete(db: SupabaseClient<Database>, id: string): Promise<void> {
    const { error } = await db.from("collections").delete().eq("id", id);
    if (error) throw error;
  },

  async getById(
    db: SupabaseClient<Database>,
    id: string
  ): Promise<CollectionWithRelations | null> {
    const { data, error } = await db
      .from("collections")
      .select(COLLECTION_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data as CollectionWithRelations | null;
  },
};
