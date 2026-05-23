import { withAuth, apiSuccess } from "@/lib/api/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { PERMISSIONS, ROLES } from "@/constants/roles.constants";

export const GET = withAuth(async () => {
  const db = getSupabaseAdminClient();

  // ── Real queries (tables exist) ──────────────────────────────────────────

  const { count: totalStaff } = await db
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", ROLES.STAFF)
    .eq("is_active", true);

  const { count: totalAdmins } = await db
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .in("role", [ROLES.ADMIN, ROLES.SUPER_ADMIN])
    .eq("is_active", true);

  // ── Placeholder queries (replace when tables are ready) ──────────────────
  // TODO: replace with real queries once orders, dealers, returns tables exist

  const totalOrders = 0;       // orders table
  const pendingApprovals = 0;  // orders where status = 'PENDING'
  const totalDealers = 0;      // dealers table
  const salesReturns = 0;      // returns table (this month)

  return apiSuccess({
    totalOrders,
    pendingApprovals,
    totalDealers,
    totalStaff: totalStaff ?? 0,
    totalAdmins: totalAdmins ?? 0,
    salesReturns,
  });
}, PERMISSIONS.ORDERS_VIEW);
