"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ROUTES } from "@/constants/routes.constants";
import type { DealerRow } from "@/types/database.types";

export type ConfirmOrderItem = {
  id: string;
  seedId: string;
  cropName: string;
  seedName: string;
  unit: string;
  quantity: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  dealer: DealerRow | null;
  center: string;
  transportName: string;
  deliveryCenter: string;
  items: ConfirmOrderItem[];
  notes: string;
  deliveryDate: string;
};

export function OrderConfirmModal({
  open,
  onClose,
  dealer,
  center,
  transportName,
  deliveryCenter,
  items,
  notes,
  deliveryDate,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    if (!dealer) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealerId:       dealer.id,
          center:         center         || null,
          transportName:  transportName  || null,
          deliveryCenter: deliveryCenter || null,
          deliveryDate:   deliveryDate   || null,
          notes:          notes          || null,
          items: items.map((i) => ({
            seedId:   i.seedId,
            unit:     i.unit,
            quantity: i.quantity,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message ?? "Failed to create order");
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        router.push(ROUTES.ORDERS.ROOT);
      }, 1500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading || success) return;
    setError("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="w-[calc(100vw-2rem)] max-w-4xl h-[90vh] flex flex-col overflow-hidden p-0"
        showCloseButton={!loading && !success}
      >
        {success ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-[var(--accent)]">
              <CheckCircle2Icon className="size-7 text-[var(--accent-foreground)]" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">Order placed!</p>
              <p className="mt-1 text-sm text-muted-foreground">Redirecting to orders…</p>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader className="shrink-0 px-6 pt-5 pb-4 border-b border-border">
              <DialogTitle className="text-base">Order Summary</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5 min-w-0">
              {/* Dealer & meta grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Dealer</p>
                  <p className="font-medium">{dealer?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Contact</p>
                  <p className="font-medium">{dealer?.contact ?? "—"}</p>
                </div>
                {center && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Center</p>
                    <p className="font-medium">{center}</p>
                  </div>
                )}
                {transportName && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Transport</p>
                    <p className="font-medium">{transportName}</p>
                  </div>
                )}
                {deliveryCenter && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Delivery Center</p>
                    <p className="font-medium">{deliveryCenter}</p>
                  </div>
                )}
                {deliveryDate && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Delivery Date</p>
                    <p className="font-medium">
                      {new Date(deliveryDate).toLocaleDateString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Items table */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Crop Details
                </p>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="py-2 pl-3 pr-2 text-left text-xs font-medium text-muted-foreground">Crop</th>
                        <th className="py-2 px-2 text-left text-xs font-medium text-muted-foreground">Variety / Pack</th>
                        <th className="py-2 px-2 text-center text-xs font-medium text-muted-foreground">Unit</th>
                        <th className="py-2 pl-2 pr-3 text-center text-xs font-medium text-muted-foreground">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={item.id} className={idx % 2 === 0 ? "" : "bg-muted/20"}>
                          <td className="py-2.5 pl-3 pr-2 font-medium">{item.cropName}</td>
                          <td className="py-2.5 px-2 text-muted-foreground">{item.seedName}</td>
                          <td className="py-2.5 px-2 text-center">{item.unit}</td>
                          <td className="py-2.5 pl-2 pr-3 text-center tabular-nums font-medium">{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive rounded-lg bg-destructive/10 px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            <DialogFooter className="shrink-0 px-6">
              <Button variant="outline" size="sm" onClick={handleClose} disabled={loading}>
                Edit
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={loading}
                className="bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent)]/80"
              >
                {loading && <Loader2Icon className="size-3.5 animate-spin" />}
                Confirm Order
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
