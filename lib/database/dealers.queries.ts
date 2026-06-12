import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DealerRow } from "@/types/database.types";
import type { PaginationParams } from "@/types/common.types";
import { toTitleCase } from "@/lib/utils/normalize";
import { ROLES } from "@/constants/roles.constants";
import { friendlyDbErrorMessage } from "@/lib/database/db-errors";

export type DealerWithStaffRow = DealerRow & {
  staff: { id: string; name: string; username: string } | null;
};

export interface DealerBulkUploadRow {
  name: string;
  contact?: string;
  territory?: string;
  staff_username?: string;
  default_transport?: string;
  notes?: string;
}

// Type alias (not interface) so it satisfies the Json index signature of bulk_upload_logs.results
export type DealerBulkUploadResult = {
  row: number;
  name: string;
  contact?: string;
  success: boolean;
  message: string;
};

const DEALER_SELECT = "*, staff:profiles(id, name, username)";

export const dealersQueries = {
  async getById(
    db: SupabaseClient<Database>,
    id: string,
    orgId: string
  ): Promise<DealerWithStaffRow | null> {
    const { data, error } = await db
      .from("dealers")
      .select(DEALER_SELECT)
      .eq("id", id)
      .eq("organization_id", orgId)
      .single();
    if (error) throw error;
    return data as DealerWithStaffRow;
  },

  async getAll(
    db: SupabaseClient<Database>,
    orgId: string,
    params?: PaginationParams & { status?: string; staffId?: string; territory?: string }
  ) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = db
      .from("dealers")
      .select(DEALER_SELECT, { count: "exact" })
      .eq("organization_id", orgId);

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
    orgId: string,
    payload: Omit<Database["public"]["Tables"]["dealers"]["Insert"], "organization_id">
  ): Promise<DealerWithStaffRow> {
    const { data, error } = await db
      .from("dealers")
      .insert({ ...payload, organization_id: orgId })
      .select(DEALER_SELECT)
      .single();
    if (error) throw error;
    return data as DealerWithStaffRow;
  },

  async update(
    db: SupabaseClient<Database>,
    id: string,
    orgId: string,
    payload: Database["public"]["Tables"]["dealers"]["Update"]
  ): Promise<DealerWithStaffRow> {
    const { data, error } = await db
      .from("dealers")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", orgId)
      .select(DEALER_SELECT)
      .single();
    if (error) throw error;
    return data as DealerWithStaffRow;
  },

  async delete(db: SupabaseClient<Database>, id: string, orgId: string): Promise<void> {
    const { error } = await db
      .from("dealers")
      .delete()
      .eq("id", id)
      .eq("organization_id", orgId);
    if (error) throw error;
  },

  async bulkDelete(db: SupabaseClient<Database>, ids: string[], orgId: string): Promise<void> {
    const { error } = await db
      .from("dealers")
      .delete()
      .in("id", ids)
      .eq("organization_id", orgId);
    if (error) throw error;
  },

  // Row-by-row insert with per-row error collection — a bad row never
  // fails the whole batch (matches the bulk-upload UX).
  async bulkInsert(
    db: SupabaseClient<Database>,
    orgId: string,
    rows: DealerBulkUploadRow[]
  ): Promise<{ results: DealerBulkUploadResult[]; successCount: number }> {
    const results: DealerBulkUploadResult[] = [];
    let successCount = 0;

    // Resolve all staff usernames in one org-scoped query (usernames are stored lowercase)
    const usernames = [
      ...new Set(
        rows
          .map((r) => r.staff_username?.trim().toLowerCase())
          .filter((u): u is string => !!u)
      ),
    ];
    const staffByUsername = new Map<string, { id: string; territory: string | null }>();
    if (usernames.length > 0) {
      const { data: staffRows, error: staffErr } = await db
        .from("profiles")
        .select("id, username, territory")
        .eq("organization_id", orgId)
        .eq("role", ROLES.STAFF)
        .is("deleted_at", null)
        .in("username", usernames);
      if (staffErr) throw staffErr;
      for (const s of staffRows ?? []) {
        staffByUsername.set(s.username, { id: s.id, territory: s.territory });
      }
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      if (!row.name?.trim()) {
        results.push({ row: rowNum, name: row.name ?? "", contact: row.contact ?? "", success: false, message: 'The "name" column is empty — every dealer needs a name' });
        continue;
      }

      const username = row.staff_username?.trim().toLowerCase();
      const staff = username ? staffByUsername.get(username) : undefined;
      if (username && !staff) {
        results.push({ row: rowNum, name: row.name, contact: row.contact, success: false, message: `No staff user found with username "${username}" — check the exact username on the Users page, fix the sheet and re-upload this row` });
        continue;
      }

      const { error: insertErr } = await db.from("dealers").insert({
        organization_id:   orgId,
        name:              toTitleCase(row.name),
        contact:           row.contact?.trim()                              || null,
        staff_id:          staff?.id ?? null,
        // Like the dealer form, fall back to the assigned staff's territory
        territory:         row.territory?.trim()     ? toTitleCase(row.territory)      : staff?.territory ?? null,
        default_transport: row.default_transport?.trim() ? toTitleCase(row.default_transport) : null,
        notes:             row.notes?.trim()                                || null,
      });

      if (insertErr) {
        console.error(`dealers bulkInsert row ${rowNum} error:`, insertErr.message);
        results.push({ row: rowNum, name: row.name, contact: row.contact, success: false, message: friendlyDbErrorMessage(insertErr, "dealer") });
        continue;
      }

      successCount++;
      results.push({ row: rowNum, name: row.name, contact: row.contact, success: true, message: "Created" });
    }

    return { results, successCount };
  },
};
