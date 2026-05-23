"use client";

import { useState } from "react";
import { PrinterIcon, TruckIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { OrderWithRelations } from "@/types/order.types";
import { APP_NAME } from "@/constants/app.constants";


interface CreateChallanDialogProps {
  order: OrderWithRelations | null;
  open: boolean;
  onClose: () => void;
  onDispatched: () => void;
}

export function CreateChallanDialog({
  order,
  open,
  onClose,
  onDispatched,
}: CreateChallanDialogProps) {
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDispatch() {
    if (!order) return;
    setDispatching(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SHIPPED" }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.message ?? "Failed to update status.");
        return;
      }
      onDispatched();
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setDispatching(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (!order) return null;

  const challanNumber = `DC-${order.order_number}`;
  const date = new Date(order.created_at).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setError(null); onClose(); } }}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Delivery Challan</DialogTitle>
        </DialogHeader>

        {/* Challan body */}
        <div className="flex flex-col gap-4 rounded-md border border-border p-4 text-sm">
          {/* Header row */}
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <div>
              <p className="font-semibold text-base">{APP_NAME}</p>
              <p className="text-xs text-muted-foreground">Delivery Challan</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-xs font-medium">{challanNumber}</p>
              <p className="text-xs text-muted-foreground">{date}</p>
            </div>
          </div>

          <Separator />

          {/* Dealer details */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Deliver To
            </p>
            <p className="font-medium">{order.dealer?.name ?? "—"}</p>
            {order.dealer?.territory && (
              <p className="text-xs text-muted-foreground">{order.dealer.territory}</p>
            )}
            {order.dealer?.contact && (
              <p className="text-xs text-muted-foreground">{order.dealer.contact}</p>
            )}
          </div>

          <Separator />

          {/* Items table */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Items
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-1.5 text-left font-medium text-muted-foreground">Seed</th>
                  <th className="pb-1.5 text-right font-medium text-muted-foreground">Unit</th>
                  <th className="pb-1.5 text-right font-medium text-muted-foreground">Qty</th>
                </tr>
              </thead>
              <tbody>
                {(order.items ?? []).map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="py-1.5">
                      <span className="font-medium">{item.seed?.crops?.name ?? "—"}</span>
                      {item.seed?.variety && (
                        <span className="text-muted-foreground"> ({item.seed.variety})</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right text-muted-foreground">
                      {item.unit ?? item.seed?.pack_size ?? "—"}
                    </td>
                    <td className="py-1.5 text-right font-medium">
                      {item.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signature area */}
          <div className="mt-2 grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div className="border-t border-border pt-6 text-center">
              Authorised Signature
            </div>
            <div className="border-t border-border pt-6 text-center">
              Receiver&apos;s Signature
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <PrinterIcon className="size-3.5" />
            Print Challan
          </Button>
          <Button
            size="sm"
            className="bg-accent text-accent-foreground hover:bg-accent/80 border-0"
            onClick={handleDispatch}
            disabled={dispatching}
          >
            <TruckIcon className="size-3.5" />
            {dispatching ? "Dispatching…" : "Confirm & Mark Dispatched"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
