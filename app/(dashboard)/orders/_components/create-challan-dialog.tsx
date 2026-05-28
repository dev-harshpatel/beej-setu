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
import type { OrderWithRelations } from "@/types/order.types";
import type { ChallanRow } from "@/types/database.types";
import { APP_NAME } from "@/constants/app.constants";
import {
  ORDER_STATUSES,
  CHALLAN_ELIGIBLE_STATUSES,
  TRANSPORT_UPDATE_ELIGIBLE_STATUSES,
} from "@/constants/order-status.constants";


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
  const [godownDate, setGodownDate] = useState(new Date().toISOString().split("T")[0]);
  const [transportDispatchDate, setTransportDispatchDate] = useState("");

  // Existing challan for GODOWN_DISPATCHED orders
  const [existingChallan, setExistingChallan] = useState<ChallanRow | null>(null);
  const [loadingChallan, setLoadingChallan] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCreatingChallan = order
    ? CHALLAN_ELIGIBLE_STATUSES.includes(order.status as never)
    : false;
  const isUpdatingTransport = order
    ? TRANSPORT_UPDATE_ELIGIBLE_STATUSES.includes(order.status as never)
    : false;

  // Seed defaults when the dialog opens
  useEffect(() => {
    if (!order || !open) return;
    setError(null);
    setTransport(order.dealer?.default_transport ?? "");
    setChallanNumber(`DC-${order.order_number}`);
    setLrNumber("");
    setGodownDate(new Date().toISOString().split("T")[0]);
    setTransportDispatchDate("");
    setExistingChallan(null);

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
            setGodownDate(c.godown_dispatch_date);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingChallan(false));
    }
  }, [order, open]);

  async function handleGodownDispatch() {
    if (!order) return;
    if (!challanNumber.trim()) { setError("Challan number is required."); return; }
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
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.message ?? "Failed to save challan."); return; }
      onDispatched();
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTransportDispatch() {
    if (!order) return;
    if (!transportDispatchDate) { setError("Transport dispatch date is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/challans/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transport_dispatch_date: transportDispatchDate }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.message ?? "Failed to update dispatch date."); return; }
      onDispatched();
      onClose();
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
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setError(null); onClose(); } }}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isUpdatingTransport ? "Update Transport Dispatch" : "Delivery Challan"}
          </DialogTitle>
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
              <p className="text-xs text-muted-foreground">{displayDate}</p>
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
                    <td className="py-1.5 text-right font-medium">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Separator />

          {/* Dispatch fields */}
          {loadingChallan ? (
            <p className="text-xs text-muted-foreground">Loading challan details…</p>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Transport */}
              <div className="grid gap-1.5">
                <Label htmlFor="transport" className="text-xs">Transport</Label>
                <Input
                  id="transport"
                  value={transport}
                  onChange={(e) => setTransport(e.target.value)}
                  placeholder="Transport name"
                  className="h-8 text-sm"
                  readOnly={isUpdatingTransport}
                />
              </div>

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

              {/* LR Number */}
              <div className="grid gap-1.5">
                <Label htmlFor="lr-number" className="text-xs">LR Number</Label>
                <Input
                  id="lr-number"
                  value={lrNumber}
                  onChange={(e) => setLrNumber(e.target.value)}
                  placeholder="Lorry Receipt number"
                  className="h-8 text-sm"
                  readOnly={isUpdatingTransport}
                />
              </div>

              {/* Godown Dispatch Date */}
              {isCreatingChallan && (
                <div className="grid gap-1.5">
                  <Label htmlFor="godown-date" className="text-xs">Godown Dispatch Date</Label>
                  <Input
                    id="godown-date"
                    type="date"
                    value={godownDate}
                    min={order?.created_at?.split("T")[0]}
                    onChange={(e) => setGodownDate(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              )}

              {/* Transport Dispatch Date — shown when updating or as optional on create */}
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
      </DialogContent>
    </Dialog>
  );
}
