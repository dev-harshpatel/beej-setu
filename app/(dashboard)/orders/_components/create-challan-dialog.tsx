"use client";

import { useEffect, useState } from "react";
import { PrinterIcon, TruckIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrderWithRelations } from "@/types/order.types";
import type { ChallanRow } from "@/types/database.types";
import { APP_NAME } from "@/constants/app.constants";
import {
  ORDER_STATUSES,
  CHALLAN_ELIGIBLE_STATUSES,
  TRANSPORT_UPDATE_ELIGIBLE_STATUSES,
} from "@/constants/order-status.constants";
import { useAuthStore } from "@/store/auth.store";
import {
  buildGodownDispatchWhatsAppMessage,
  buildTransportDispatchWhatsAppMessage,
} from "@/lib/whatsapp";
import { WhatsAppSharePanel } from "./whatsapp-share-panel";

interface BatchOption {
  batch_number: string;
  bag_stock: number;
  packet_stock: number;
}

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
  // Form fields
  const [transport, setTransport] = useState("");
  const [challanNumber, setChallanNumber] = useState("");
  const [lrNumber, setLrNumber] = useState("");
  const [godownDate] = useState(new Date().toISOString().split("T")[0]);
  const [transportDispatchDate, setTransportDispatchDate] = useState("");

  // Existing challan for GODOWN_DISPATCHED orders
  const [existingChallan, setExistingChallan] = useState<ChallanRow | null>(null);
  const [loadingChallan, setLoadingChallan] = useState(false);

  // Batch state
  // batchOverrides: current batch selection per item (initialised from item.batch_number)
  const [batchOverrides, setBatchOverrides] = useState<Record<string, string>>({});
  const [batchChangeReason, setBatchChangeReason] = useState("");
  const [availableBatches, setAvailableBatches] = useState<Record<string, BatchOption[]>>({});
  const [loadingBatches, setLoadingBatches] = useState(false);

  const currentUser = useAuthStore((s) => s.user);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whatsappMessage, setWhatsappMessage] = useState<string | null>(null);
  const [whatsappType, setWhatsappType] = useState<"godown" | "transport" | null>(null);

  const isCreatingChallan = order
    ? CHALLAN_ELIGIBLE_STATUSES.includes(order.status as never)
    : false;
  const isUpdatingTransport = order
    ? TRANSPORT_UPDATE_ELIGIBLE_STATUSES.includes(order.status as never)
    : false;

  // Seed defaults + batch loading when the dialog opens
  useEffect(() => {
    if (!order || !open) return;
    setError(null);
    setWhatsappMessage(null);
    setWhatsappType(null);
    setTransport(order.dealer?.default_transport ?? "");
    setChallanNumber(`DC-${order.order_number}`);
    setLrNumber("");
    setTransportDispatchDate("");
    setExistingChallan(null);
    setBatchChangeReason("");

    // Initialise batch overrides from currently assigned batch numbers
    const initOverrides: Record<string, string> = {};
    for (const item of order.items ?? []) {
      if (item.batch_number) initOverrides[item.id] = item.batch_number;
    }
    setBatchOverrides(initOverrides);

    // Load available batches per unique seed
    const seedIds = [...new Set((order.items ?? []).map((i) => i.seed_id))];
    if (seedIds.length > 0) {
      setLoadingBatches(true);
      Promise.all(
        seedIds.map((seedId) =>
          fetch(`/api/stock/batches?seedId=${seedId}`)
            .then((r) => r.json())
            .then((json) => ({ seedId, batches: (json.data ?? []) as BatchOption[] }))
            .catch(() => ({ seedId, batches: [] as BatchOption[] }))
        )
      ).then((results) => {
        const map: Record<string, BatchOption[]> = {};
        for (const { seedId, batches } of results) map[seedId] = batches;
        setAvailableBatches(map);
        setLoadingBatches(false);
      });
    }

    // For GODOWN_DISPATCHED orders, load the existing challan
    if (order.status === ORDER_STATUSES.GODOWN_DISPATCHED) {
      setLoadingChallan(true);
      fetch(`/api/challans/${order.id}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success && json.data) {
            const c = json.data as ChallanRow;
            setExistingChallan(c);
            setTransport(c.transport_name ?? "");
            setChallanNumber(c.challan_number);
            setLrNumber(c.lr_number ?? "");
          }
        })
        .catch(() => {})
        .finally(() => setLoadingChallan(false));
    }
  }, [order, open]);

  // Items whose batch was changed from the original assignment
  const changedItems = (order?.items ?? []).filter((item) => {
    const override = batchOverrides[item.id];
    return override && override !== (item.batch_number ?? "");
  });
  const hasBatchChanges = changedItems.length > 0;

  // Build itemBatches payload: only items where batch differs from original
  function buildBatchPayload() {
    if (!hasBatchChanges) return [];
    return changedItems.map((item) => ({
      itemId: item.id,
      batchNumber: batchOverrides[item.id],
      changeReason: batchChangeReason.trim(),
    }));
  }

  function buildShareItems() {
    return (order?.items ?? []).map((item) => ({
      cropName:    item.seed?.crops?.name ?? "—",
      seedName:    item.seed?.variety ?? "—",
      unit:        item.unit,
      quantity:    item.quantity,
      batchNumber: batchOverrides[item.id] ?? item.batch_number ?? undefined,
    }));
  }

  async function handleGodownDispatch() {
    if (!order) return;
    if (!challanNumber.trim()) { setError("Challan number is required."); return; }
    if (hasBatchChanges && !batchChangeReason.trim()) {
      setError("Please enter a reason for the batch change."); return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/challans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.id,
          challan_number: challanNumber.trim(),
          transport_name: transport.trim() || null,
          lr_number: lrNumber.trim() || null,
          godown_dispatch_date: godownDate,
          itemBatches: buildBatchPayload(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.message ?? "Failed to save challan."); return; }
      onDispatched();
      const msg = buildGodownDispatchWhatsAppMessage({
        orderNumber:  order.order_number,
        challanNumber: challanNumber.trim(),
        dealer:       order.dealer!,
        transport:    transport.trim() || undefined,
        dispatchedBy: currentUser?.name,
        notes:        order.notes ?? undefined,
        items:        buildShareItems(),
      });
      setWhatsappMessage(msg);
      setWhatsappType("godown");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTransportDispatch() {
    if (!order) return;
    if (!transportDispatchDate) { setError("Transport dispatch date is required."); return; }
    if (hasBatchChanges && !batchChangeReason.trim()) {
      setError("Please enter a reason for the batch change."); return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/challans/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transport_dispatch_date: transportDispatchDate,
          lr_number: lrNumber.trim() || null,
          itemBatches: buildBatchPayload(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.message ?? "Failed to update dispatch date."); return; }
      onDispatched();
      const msg = buildTransportDispatchWhatsAppMessage({
        orderNumber:   order.order_number,
        challanNumber: existingChallan?.challan_number ?? challanNumber.trim(),
        dealer:        order.dealer!,
        transport:     transport.trim() || undefined,
        lrNumber:      lrNumber.trim() || undefined,
        transportDate: transportDispatchDate,
        dispatchedBy:  currentUser?.name,
        items:         buildShareItems(),
      });
      setWhatsappMessage(msg);
      setWhatsappType("transport");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (!order) return null;

  const displayDate = new Date(order.created_at).toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setError(null); setWhatsappMessage(null); setWhatsappType(null); onClose(); } }}>
      <DialogContent className="w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {whatsappMessage
              ? whatsappType === "transport" ? "Transport Dispatched" : "Godown Dispatched"
              : isUpdatingTransport ? "Update Transport Dispatch" : "Delivery Challan"}
          </DialogTitle>
        </DialogHeader>

        {whatsappMessage ? (
          <WhatsAppSharePanel
            message={whatsappMessage}
            title={whatsappType === "transport" ? "Share Transport Dispatch" : "Share Godown Dispatch"}
            subtitle="Send dispatch details to the group via WhatsApp."
            doneLabel="Close"
            onDone={() => { setWhatsappMessage(null); setWhatsappType(null); onClose(); }}
          />
        ) : (
        <>
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
              <p className="text-xs text-muted-foreground">{displayDate}</p>
            </div>
          </div>

          <Separator />

          {/* Dealer details + editable transport */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Deliver To
            </p>
            <div>
              <p className="font-medium">{order.dealer?.name ?? "—"}</p>
              {order.dealer?.territory && (
                <p className="text-xs text-muted-foreground">{order.dealer.territory}</p>
              )}
              {order.dealer?.contact && (
                <p className="text-xs text-muted-foreground">{order.dealer.contact}</p>
              )}
            </div>
            {!loadingChallan && (
              <div className="grid gap-1">
                <Label htmlFor="transport" className="text-xs text-muted-foreground">Transport</Label>
                <Input
                  id="transport"
                  value={transport}
                  onChange={(e) => setTransport(e.target.value)}
                  placeholder="Transport name"
                  className="h-8 text-sm"
                  readOnly={isUpdatingTransport}
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Items table with batch column */}
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
                  <th className="pb-1.5 pl-2 text-left font-medium text-muted-foreground">Batch</th>
                </tr>
              </thead>
              <tbody>
                {(order.items ?? []).map((item) => {
                  const batches = availableBatches[item.seed_id] ?? [];
                  const currentBatch = batchOverrides[item.id] ?? "";
                  const isChanged = currentBatch && currentBatch !== (item.batch_number ?? "");

                  return (
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
                      <td className="py-1.5 text-right font-medium">{item.quantity}</td>
                      <td className="py-1.5 pl-2">
                        {loadingBatches ? (
                          <span className="text-muted-foreground">…</span>
                        ) : batches.length === 0 ? (
                          <span className="text-muted-foreground font-mono">
                            {item.batch_number ?? "—"}
                          </span>
                        ) : (
                          <Select
                            value={currentBatch}
                            onValueChange={(v) =>
                              setBatchOverrides((prev) => ({ ...prev, [item.id]: v ?? "" }))
                            }
                          >
                            <SelectTrigger
                              className={`h-6 w-32 text-xs font-mono ${isChanged ? "border-warning text-warning" : ""}`}
                            >
                              <SelectValue placeholder="—" />
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

            {/* Unit totals */}
            {(() => {
              const totals: Record<string, number> = {};
              for (const item of order.items ?? []) {
                const unit = item.unit ?? item.seed?.pack_size ?? "Other";
                totals[unit] = (totals[unit] ?? 0) + item.quantity;
              }
              const entries = Object.entries(totals);
              if (entries.length === 0) return null;
              return (
                <div className="mt-2 flex items-center justify-end gap-3 border-t border-border pt-2">
                  <span className="text-xs text-muted-foreground">Total:</span>
                  {entries.map(([unit, total]) => (
                    <span key={unit} className="text-xs font-semibold">
                      {total} {unit}{total !== 1 ? "s" : ""}
                    </span>
                  ))}
                </div>
              );
            })()}

            {/* Reason for batch change — only shown when dispatch changes a batch */}
            {hasBatchChanges && (
              <div className="mt-3 grid gap-1.5 rounded-md border border-warning/40 bg-warning/5 p-3">
                <Label htmlFor="batch-reason" className="text-xs font-medium text-warning">
                  Reason for batch change <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="batch-reason"
                  value={batchChangeReason}
                  onChange={(e) => setBatchChangeReason(e.target.value)}
                  placeholder="e.g. Original batch exhausted, using next available"
                  className="h-8 text-xs"
                />
              </div>
            )}
          </div>

          {order.notes && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Delivery Instructions
                </p>
                <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Dispatch fields */}
          {loadingChallan ? (
            <p className="text-xs text-muted-foreground">Loading challan details…</p>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Challan Number */}
              <div className="grid gap-1.5">
                <Label htmlFor="challan-number" className="text-xs">Challan Number</Label>
                <Input
                  id="challan-number"
                  value={challanNumber}
                  onChange={(e) => setChallanNumber(e.target.value)}
                  placeholder="e.g. DC-1001"
                  className="h-8 text-sm font-mono"
                  readOnly={isUpdatingTransport}
                />
              </div>

              {/* LR Number — only on Transport Dispatch step */}
              {(isUpdatingTransport || existingChallan) && (
                <div className="grid gap-1.5">
                  <Label htmlFor="lr-number" className="text-xs">LR Number</Label>
                  <Input
                    id="lr-number"
                    value={lrNumber}
                    onChange={(e) => setLrNumber(e.target.value)}
                    placeholder="Lorry Receipt number"
                    className="h-8 text-sm"
                  />
                </div>
              )}

              {/* Transport Dispatch Date */}
              {(isUpdatingTransport || existingChallan) && (
                <div className="grid gap-1.5">
                  <Label htmlFor="transport-date" className="text-xs">
                    Transport Dispatch Date
                    {isUpdatingTransport && <span className="text-destructive ml-0.5">*</span>}
                  </Label>
                  <Input
                    id="transport-date"
                    type="date"
                    value={transportDispatchDate}
                    onChange={(e) => setTransportDispatchDate(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Date the transport company dispatched to the dealer.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Signature area */}
          <div className="mt-2 grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div className="border-t border-border pt-6 text-center">Authorised Signature</div>
            <div className="border-t border-border pt-6 text-center">Receiver&apos;s Signature</div>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <PrinterIcon className="size-3.5" />
            Print
          </Button>

          {isCreatingChallan && (
            <Button
              size="sm"
              className="bg-blue-600 text-white hover:bg-blue-700 border-0"
              onClick={handleGodownDispatch}
              disabled={saving}
            >
              <TruckIcon className="size-3.5" />
              {saving ? "Saving…" : "Mark Godown Dispatched"}
            </Button>
          )}

          {isUpdatingTransport && (
            <Button
              size="sm"
              className="bg-purple-600 text-white hover:bg-purple-700 border-0"
              onClick={handleTransportDispatch}
              disabled={saving}
            >
              <TruckIcon className="size-3.5" />
              {saving ? "Saving…" : "Mark Transport Dispatched"}
            </Button>
          )}
        </DialogFooter>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}
