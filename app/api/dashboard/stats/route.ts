import { withAuth, apiSuccess } from "@/lib/api/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { PERMISSIONS, ROLES } from "@/constants/roles.constants";

export const GET = withAuth(async () => {
  const db = getSupabaseAdminClient();

  const [
    { count: totalStaff },
    { count: totalAdmins },
    { count: totalOrders },
    { count: pendingApprovals },
    { count: totalDealers },
  ] = await Promise.all([
    db.from("profiles").select("*", { count: "exact", head: true }).eq("role", ROLES.STAFF).eq("is_active", true),
    db.from("profiles").select("*", { count: "exact", head: true }).in("role", [ROLES.ADMIN, ROLES.SUPER_ADMIN]).eq("is_active", true),
    db.from("orders").select("*", { count: "exact", head: true }),
    db.from("orders").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
    db.from("dealers").select("*", { count: "exact", head: true }).eq("status", "ACTIVE").is("deleted_at", null),
  ]);

  return apiSuccess({
    totalOrders:      totalOrders      ?? 0,
    pendingApprovals: pendingApprovals ?? 0,
    totalDealers:     totalDealers     ?? 0,
    totalStaff:       totalStaff       ?? 0,
    totalAdmins:      totalAdmins      ?? 0,
    salesReturns:     0,
  });
}, PERMISSIONS.ORDERS_VIEW);
