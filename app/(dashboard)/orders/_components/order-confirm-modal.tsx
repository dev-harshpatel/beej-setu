"use client";

import { useState } from "react";
import { CheckCircleIcon, PencilIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { OrderStatusBadge } from "./order-status-badge";
import type { OrderWithRelations } from "@/types/order.types";

interface OrderConfirmModalProps {
  order: OrderWithRelations | null;
  open: boolean;
  onClose: () => void;
  onEdit: (order: OrderWithRelations) => void;
  onConfirmed: () => void;
}

export function OrderConfirmModal({
  order,
  open,
  onClose,
  onEdit,
  onConfirmed,
}: OrderConfirmModalProps) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!order) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CONFIRMED" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message ?? "Failed to confirm order. Check stock levels.");
        return;
      }
      onConfirmed();
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setConfirming(false);
    }
  }

  function handleEdit() {
    if (!order) return;
    onClose();
    onEdit(order);
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <DialogTitle className="font-mono text-sm font-semibold">
              {order.order_number}
            </DialogTitle>
            <OrderStatusBadge status={order.status} />
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Dealer</span>
              <span className="text-sm font-medium">{order.dealer?.name ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Staff</span>
              <span className="text-sm font-medium">{order.staff?.name ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Date</span>
              <span className="text-sm font-medium">
                {new Date(order.created_at).toLocaleDateString("en-IN", {
                  day: "2-digit", month: "short", year: "numeric",
                })}
              </span>
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">
              Order Items ({order.items?.length ?? 0})
            </p>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Seed</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Unit</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items ?? []).map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-medium">
                        <div>{item.seed?.crops?.name ?? "—"}</div>
                        {item.seed?.variety && (
                          <div className="text-xs text-muted-foreground">{item.seed.variety}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {item.unit ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">
                        {item.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {order.notes && (
            <div className="rounded-md border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{order.notes}</p>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="outline" size="sm" onClick={handleEdit} disabled={confirming}>
            <PencilIcon className="size-3.5" />
            Edit Order
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={confirming}>
            <CheckCircleIcon className="size-3.5" />
            {confirming ? "Confirming…" : "Confirm Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
