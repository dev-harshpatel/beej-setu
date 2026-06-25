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
  center?: string;
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

  // Row-by-row upsert with per-row error collection — a bad row never
  // fails the whole batch (matches the bulk-upload UX).
  // Match key: normalized dealer name (toTitleCase) within the org.
  // Existing non-deleted dealers are updated if any field changed; new ones are inserted.
  async getDistinctTerritories(
    db: SupabaseClient<Database>,
    orgId: string,
    staffId?: string
  ): Promise<string[]> {
    let query = db
      .from("dealers")
      .select("territory")
      .eq("organization_id", orgId)
      .is("deleted_at", null)
      .not("territory", "is", null);

    if (staffId) {
      query = query.eq("staff_id", staffId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const seen = new Set<string>();
    for (const row of data ?? []) {
      if (row.territory) seen.add(row.territory);
    }
    return Array.from(seen).sort();
  },

  // Row-by-row upsert with per-row error collection — a bad row never
  // fails the whole batch (matches the bulk-upload UX).
  // Match key: normalized dealer name (toTitleCase) within the org.
  // Existing non-deleted dealers are updated if any field changed; new ones are inserted.
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

    // Fetch all existing non-deleted dealers for this org in one query
    const { data: existingDealers, error: existErr } = await db
      .from("dealers")
      .select("id, name, contact, staff_id, territory, center, default_transport, notes")
      .eq("organization_id", orgId)
      .is("deleted_at", null);
    if (existErr) throw existErr;

    // Map by lowercase normalized name for O(1) lookup
    type ExistingDealer = NonNullable<typeof existingDealers>[number];
    const existingByName = new Map<string, ExistingDealer>();
    for (const d of existingDealers ?? []) {
      existingByName.set(d.name.toLowerCase(), d);
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

      const normalizedName    = toTitleCase(row.name);
      const newContact        = row.contact?.trim()             || null;
      const newStaffId        = staff?.id                       ?? null;
      const newTerritory      = row.territory?.trim()           ? toTitleCase(row.territory)           : (staff?.territory ?? null);
      const newCenter         = row.center?.trim()              ? toTitleCase(row.center)              : null;
      const newTransport      = row.default_transport?.trim()   ? toTitleCase(row.default_transport)   : null;
      const newNotes          = row.notes?.trim()               || null;

      const existing = existingByName.get(normalizedName.toLowerCase());

      if (existing) {
        const hasChanges =
          existing.contact          !== newContact   ||
          existing.staff_id         !== newStaffId   ||
          existing.territory        !== newTerritory ||
          existing.center           !== newCenter    ||
          existing.default_transport !== newTransport ||
          existing.notes            !== newNotes;

        if (!hasChanges) {
          results.push({ row: rowNum, name: row.name, contact: row.contact, success: true, message: "No changes, skipped" });
          continue;
        }

        const { error: updateErr } = await db
          .from("dealers")
          .update({
            contact:           newContact,
            staff_id:          newStaffId,
            territory:         newTerritory,
            center:            newCenter,
            default_transport: newTransport,
            notes:             newNotes,
            updated_at:        new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (updateErr) {
          console.error(`dealers bulkInsert row ${rowNum} update error:`, updateErr.message);
          results.push({ row: rowNum, name: row.name, contact: row.contact, success: false, message: friendlyDbErrorMessage(updateErr, "dealer") });
          continue;
        }

        successCount++;
        results.push({ row: rowNum, name: row.name, contact: row.contact, success: true, message: "Updated" });
      } else {
        const { error: insertErr } = await db.from("dealers").insert({
          organization_id:   orgId,
          name:              normalizedName,
          contact:           newContact,
          staff_id:          newStaffId,
          // Like the dealer form, fall back to the assigned staff's territory
          territory:         newTerritory,
          center:            newCenter,
          default_transport: newTransport,
          notes:             newNotes,
        });

        if (insertErr) {
          console.error(`dealers bulkInsert row ${rowNum} error:`, insertErr.message);
          results.push({ row: rowNum, name: row.name, contact: row.contact, success: false, message: friendlyDbErrorMessage(insertErr, "dealer") });
          continue;
        }

        successCount++;
        results.push({ row: rowNum, name: row.name, contact: row.contact, success: true, message: "Created" });
      }
    }

    return { results, successCount };
  },
};
