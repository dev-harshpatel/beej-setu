"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { AlertTriangleIcon, CheckCircleIcon, PackageIcon, PencilIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ROUTES } from "@/constants/routes.constants";
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
import { formatDateMedium } from "@/lib/utils";
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
  const [isStockError, setIsStockError] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState<string | null>(null);

  // User batch overrides (starts empty; key-based remount resets on new order)
  const [batchSelections, setBatchSelections] = useState<Record<string, string>>({});

  const seedIds = useMemo(
    () => [...new Set((order?.items ?? []).map((i) => i.seed_id))],
    [order],
  );

  const batchQueries = useQueries({
    queries: seedIds.map((seedId) => ({
      queryKey: ["stock-batches", seedId],
      queryFn: async () => {
        const res = await fetch(`/api/stock/batches?seedId=${seedId}`);
        const json = await res.json();
        return (json.data ?? []) as BatchOption[];
      },
      staleTime: 60_000,
      enabled: open,
    })),
  });

  const loadingBatches = batchQueries.some((q) => q.isPending);

  const availableBatches = useMemo(() => {
    const map: Record<string, BatchOption[]> = {};
    batchQueries.forEach((q, i) => { if (q.data) map[seedIds[i]] = q.data; });
    return map;
  }, [batchQueries, seedIds]);

  // Effective selection: explicit override OR FIFO first batch per item
  function effectiveBatch(item: { id: string; seed_id: string }): string {
    return batchSelections[item.id] ?? availableBatches[item.seed_id]?.[0]?.batch_number ?? "";
  }

  async function handleConfirm() {
    if (!order) return;
    setConfirming(true);
    setError(null);
    try {
      const itemBatches = (order.items ?? [])
        .map((item) => ({ itemId: item.id, batchNumber: effectiveBatch(item) }))
        .filter(({ batchNumber }) => batchNumber);

      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED", itemBatches }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json.message ?? "Failed to confirm order. Check stock levels.";
        const stockErr = res.status === 422 && (msg.includes("Insufficient stock") || msg.includes("insufficient stock"));
        setIsStockError(stockErr);
        setError(msg);
        return;
      }
      // Build approval WhatsApp message
      const msg = buildApprovalWhatsAppMessage({
        orderNumber:   order.order_number,
        dealer:        order.dealer!,
        approvedBy:    currentUser?.name,
        transportName: order.transport_name ?? undefined,
        notes:         order.notes ?? undefined,
        items: (order.items ?? []).map((item) => ({
          cropName:    item.seed?.crops?.name ?? "—",
          seedName:    item.seed?.variety ?? "—",
          unit:        item.unit,
          quantity:    item.quantity,
          batchNumber: effectiveBatch(item),
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
    setIsStockError(false);
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
                {formatDateMedium(order.created_at)}
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
                    const selectedBatch = effectiveBatch(item);
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

          {error && !isStockError && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {isStockError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangleIcon className="size-4 text-destructive shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-destructive">Insufficient Inventory</p>
                  <p className="text-sm text-muted-foreground">
                    One or more items in this order don&apos;t have enough stock to be fulfilled.
                    Restock the inventory and then approve this order.
                  </p>
                </div>
              </div>
              <Link
                href={ROUTES.STOCK.LEDGER}
                className={buttonVariants({ variant: "outline", size: "sm" }) + " self-start gap-1.5"}
              >
                <PackageIcon className="size-3.5" />
                Go to Inventory
              </Link>
            </div>
          )}
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
