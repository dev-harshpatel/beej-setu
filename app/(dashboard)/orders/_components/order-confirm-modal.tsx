"use client";

import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrderStatusBadge } from "./order-status-badge";
import { WhatsAppSharePanel } from "./whatsapp-share-panel";
import { useAuthStore } from "@/store/auth.store";
import { buildApprovalWhatsAppMessage } from "@/lib/whatsapp";
import type { OrderWithRelations } from "@/types/order.types";

interface BatchOption {
  batch_number: string;
  bag_stock: number;
  packet_stock: number;
}

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
  const currentUser = useAuthStore((s) => s.user);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whatsappMessage, setWhatsappMessage] = useState<string | null>(null);

  // Batch selection state: { [itemId]: batchNumber }
  const [batchSelections, setBatchSelections] = useState<Record<string, string>>({});
  // Available batches per seed: { [seedId]: BatchOption[] }
  const [availableBatches, setAvailableBatches] = useState<Record<string, BatchOption[]>>({});
  const [loadingBatches, setLoadingBatches] = useState(false);

  // Load available batches when modal opens
  useEffect(() => {
    if (!order || !open) return;
    setBatchSelections({});
    setAvailableBatches({});

    const seedIds = [...new Set((order.items ?? []).map((i) => i.seed_id))];
    if (seedIds.length === 0) return;

    setLoadingBatches(true);
    Promise.all(
      seedIds.map((seedId) =>
        fetch(`/api/stock/batches?seedId=${seedId}`)
          .then((r) => r.json())
          .then((json) => ({ seedId, batches: (json.data ?? []) as BatchOption[] }))
          .catch(() => ({ seedId, batches: [] as BatchOption[] }))
      )
    ).then((results) => {
      const batchMap: Record<string, BatchOption[]> = {};
      const selections: Record<string, string> = {};

      for (const { seedId, batches } of results) {
        batchMap[seedId] = batches;
      }
      // Pre-select first available (FIFO) batch per item
      for (const item of order.items ?? []) {
        const batches = batchMap[item.seed_id] ?? [];
        if (batches.length > 0) selections[item.id] = batches[0].batch_number;
      }

      setAvailableBatches(batchMap);
      setBatchSelections(selections);
      setLoadingBatches(false);
    });
  }, [order, open]);

  async function handleConfirm() {
    if (!order) return;
    setConfirming(true);
    setError(null);
    try {
      // Build itemBatches array from selections
      const itemBatches = Object.entries(batchSelections)
        .filter(([, batchNumber]) => batchNumber)
        .map(([itemId, batchNumber]) => ({ itemId, batchNumber }));

      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED", itemBatches }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message ?? "Failed to confirm order. Check stock levels.");
        return;
      }
      // Build approval WhatsApp message
      const msg = buildApprovalWhatsAppMessage({
        orderNumber:   order.order_number,
        dealer:        order.dealer!,
        staffName:     order.staff?.name,
        approvedBy:    currentUser?.name,
        center:        order.center ?? undefined,
        transportName: order.transport_name ?? undefined,
        notes:         order.notes ?? undefined,
        items: (order.items ?? []).map((item) => ({
          cropName:    item.seed?.crops?.name ?? "—",
          seedName:    item.seed?.variety ?? "—",
          unit:        item.unit,
          quantity:    item.quantity,
          batchNumber: batchSelections[item.id],
        })),
      });
      setWhatsappMessage(msg);
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
    setWhatsappMessage(null);
    onClose();
  }

  function handleWhatsAppDone() {
    setWhatsappMessage(null);
    onConfirmed();
    onClose();
  }

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {whatsappMessage ? (
          <>
            <DialogHeader>
              <DialogTitle>Order Approved</DialogTitle>
            </DialogHeader>
            <WhatsAppSharePanel
              message={whatsappMessage}
              title="Share Approval on WhatsApp"
              subtitle="Let the team know this order has been approved."
              doneLabel="Close"
              onDone={handleWhatsAppDone}
            />
          </>
        ) : (
        <>
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

          {/* Items with batch assignment */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">
                Order Items ({order.items?.length ?? 0})
              </p>
              {loadingBatches && (
                <span className="text-xs text-muted-foreground">Loading batches…</span>
              )}
            </div>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Crop / Seed</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Unit</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Qty</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Batch</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items ?? []).map((item) => {
                    const batches = availableBatches[item.seed_id] ?? [];
                    const selectedBatch = batchSelections[item.id] ?? "";
                    return (
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
                        <td className="px-3 py-2">
                          {loadingBatches ? (
                            <span className="text-xs text-muted-foreground">…</span>
                          ) : batches.length === 0 ? (
                            <span className="text-xs text-destructive">No stock</span>
                          ) : (
                            <Select
                              value={selectedBatch}
                              onValueChange={(v) =>
                                setBatchSelections((prev) => ({ ...prev, [item.id]: v ?? "" }))
                              }
                            >
                              <SelectTrigger className="h-7 w-40 text-xs">
                                <SelectValue placeholder="Select batch" />
                              </SelectTrigger>
                              <SelectContent>
                                {batches.map((b) => (
                                  <SelectItem key={b.batch_number} value={b.batch_number} className="text-xs">
                                    <span className="font-mono">{b.batch_number}</span>
                                    <span className="ml-1.5 text-muted-foreground">
                                      ({b.bag_stock}B {b.packet_stock}P)
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {order.notes && (
            <div className="rounded-md border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Delivery Instructions</p>
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
          <Button size="sm" onClick={handleConfirm} disabled={confirming || loadingBatches}>
            <CheckCircleIcon className="size-3.5" />
            {confirming ? "Confirming…" : "Confirm & Approve"}
          </Button>
        </DialogFooter>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}
