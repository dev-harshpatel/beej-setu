import { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ordersQueries } from "@/lib/database/orders.queries";
import { withAuth, apiSuccess, apiError } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";
import { ORDER_STATUSES } from "@/constants/order-status.constants";
import type { OrderWithRelations } from "@/types/order.types";

export const POST = withAuth(
  async (_req: NextRequest, ctx, { profile, orgId }) => {
    const { id } = await ctx.params;
    const db = getSupabaseAdminClient();

    const order = await ordersQueries.getById(db, id, orgId).catch(() => null) as unknown as OrderWithRelations | null;
    if (!order) return apiError("Order not found", 404);

    if (order.status !== ORDER_STATUSES.PARTIALLY_APPROVED) {
      return apiError("Only partially approved orders can be fulfilled", 422);
    }
    if (order.partial_reason !== "backorder") {
      return apiError("This order was not marked as a backorder", 422);
    }

    const itemsToFulfill = (order.items ?? []).filter((item) => {
      const requested = item.requested_quantity ?? item.quantity;
      return requested > item.quantity;
    });

    if (itemsToFulfill.length === 0) {
      return apiError("No remaining quantities to fulfill", 422);
    }

    // Validate stock availability across all items before touching anything.
    for (const item of itemsToFulfill) {
      const remaining = (item.requested_quantity ?? item.quantity) - item.quantity;
      const { data: batches, error } = await db
        .from("seed_stock")
        .select("*")
        .eq("seed_id", item.seed_id)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: true });

      if (error) return apiError("Failed to read stock", 500);

      const totalAvailable = (batches ?? []).reduce((sum, b) => {
        return sum + (item.unit === "Packet" ? b.packet_stock : b.bag_stock);
      }, 0);

      if (totalAvailable < remaining) {
        const seedName = item.seed?.crops?.name ?? item.seed_id;
        return apiError(
          `Insufficient stock for ${seedName} — need ${remaining} ${item.unit}, have ${totalAvailable}`,
          422,
        );
      }
    }

    // Deduct stock and record movements (FIFO per seed).
    for (const item of itemsToFulfill) {
      const remaining = (item.requested_quantity ?? item.quantity) - item.quantity;

      const { data: batches } = await db
        .from("seed_stock")
        .select("*")
        .eq("seed_id", item.seed_id)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: true });

      let toDeduct = remaining;
      for (const batch of batches ?? []) {
        if (toDeduct <= 0) break;
        const avail = item.unit === "Packet" ? batch.packet_stock : batch.bag_stock;
        const deduct = Math.min(toDeduct, avail);
        if (deduct === 0) continue;

        const stockUpdate =
          item.unit === "Packet"
            ? { packet_stock: avail - deduct }
            : { bag_stock: avail - deduct };

        const { error: stockErr } = await db
          .from("seed_stock")
          .update({ ...stockUpdate, updated_at: new Date().toISOString() })
          .eq("id", batch.id);
        if (stockErr) throw stockErr;

        const { error: mvErr } = await db.from("stock_movements").insert({
          organization_id:  orgId,
          seed_id:          item.seed_id,
          batch_number:     batch.batch_number,
          movement_type:    "DISPATCH",
          quantity_packets: item.unit === "Packet" ? deduct : 0,
          quantity_bags:    item.unit !== "Packet" ? deduct : 0,
          quantity_pkt_rem: 0,
          movement_by:      profile.id,
          approved_by:      profile.id,
          order_id:         id,
          notes:            `Backorder fulfillment — ${order.order_number}`,
        });
        if (mvErr) throw mvErr;

        toDeduct -= deduct;
      }

      // Update item quantity to fully match the requested quantity.
      const { error: itemErr } = await db
        .from("order_items")
        .update({ quantity: item.requested_quantity ?? item.quantity, updated_at: new Date().toISOString() })
        .eq("id", item.id)
        .eq("organization_id", orgId);
      if (itemErr) throw itemErr;
    }

    // Mark order fully approved, clear partial reason.
    const { error: orderErr } = await db
      .from("orders")
      .update({
        status:         ORDER_STATUSES.APPROVED,
        partial_reason: null,
        updated_at:     new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", orgId);
    if (orderErr) throw orderErr;

    const updated = await ordersQueries.getById(db, id, orgId);
    return apiSuccess(updated, "Backorder fulfilled — order is now fully approved");
  },
  PERMISSIONS.ORDERS_EDIT,
);
