import { withAuth, apiSuccess } from "@/lib/api/auth-guard";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/constants/roles.constants";

export interface ActivityEvent {
  id: string;
  type: "order" | "approval" | "stock";
  actor: string;
  action: string;
  target: string;
  created_at: string;
}

interface OrderRow {
  id: string;
  order_number: string;
  created_at: string;
  staff:  { name: string } | null;
  dealer: { name: string } | null;
}

interface AddMovementRow {
  id: string;
  created_at: string;
  batch_number: string;
  actor: { name: string } | null;
  seed: { variety: string; crop: { name: string } | null } | null;
}

interface DispatchMovementRow {
  id: string;
  order_id: string | null;
  created_at: string;
  approver: { name: string } | null;
  order: { order_number: string; dealer: { name: string } | null } | null;
}

export const GET = withAuth(async (_req, _ctx, { orgId }) => {
  const db = getSupabaseAdminClient();

  const [ordersRes, additionsRes, dispatchRes] = await Promise.all([
    db.from("orders")
      .select("id, order_number, created_at, staff:profiles!orders_staff_id_fkey(name), dealer:dealers(name)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(10),

    db.from("stock_movements")
      .select(`
        id, created_at, batch_number,
        actor:profiles!stock_movements_movement_by_fkey(name),
        seed:seed_products(variety, crop:crops(name))
      `)
      .eq("organization_id", orgId)
      .eq("movement_type", "ADD")
      .not("movement_by", "is", null)
      .order("created_at", { ascending: false })
      .limit(10),

    db.from("stock_movements")
      .select(`
        id, order_id, created_at,
        approver:profiles!stock_movements_approved_by_fkey(name),
        order:orders(order_number, dealer:dealers(name))
      `)
      .eq("organization_id", orgId)
      .eq("movement_type", "DISPATCH")
      .not("approved_by", "is", null)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const events: ActivityEvent[] = [];

  const orders    = (ordersRes.data   ?? []) as unknown as OrderRow[];
  const additions = (additionsRes.data ?? []) as unknown as AddMovementRow[];
  const dispatches = (dispatchRes.data ?? []) as unknown as DispatchMovementRow[];

  for (const o of orders) {
    events.push({
      id:         `order-${o.id}`,
      type:       "order",
      actor:      o.staff?.name  ?? "Staff",
      action:     "placed order",
      target:     o.dealer ? `${o.order_number} for ${o.dealer.name}` : o.order_number,
      created_at: o.created_at,
    });
  }

  for (const m of additions) {
    const label = [m.seed?.crop?.name, m.seed?.variety].filter(Boolean).join(" · ");
    events.push({
      id:         `add-${m.id}`,
      type:       "stock",
      actor:      m.actor?.name ?? "Admin",
      action:     "added stock",
      target:     label ? `${label} — Batch ${m.batch_number}` : `Batch ${m.batch_number}`,
      created_at: m.created_at,
    });
  }

  const seenOrders = new Set<string>();
  for (const m of dispatches) {
    if (!m.order_id || seenOrders.has(m.order_id)) continue;
    seenOrders.add(m.order_id);
    events.push({
      id:         `approved-${m.order_id}`,
      type:       "approval",
      actor:      m.approver?.name ?? "Admin",
      action:     "approved order",
      target:     m.order?.dealer
                    ? `${m.order.order_number} for ${m.order.dealer.name}`
                    : (m.order?.order_number ?? ""),
      created_at: m.created_at,
    });
  }

  events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return apiSuccess(events.slice(0, 20));
}, PERMISSIONS.DASHBOARD_VIEW);
