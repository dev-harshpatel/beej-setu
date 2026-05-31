"use client";

import { useState } from "react";
import { BanIcon, ClockIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type PartialReason = "deliberate" | "backorder";

interface PartialItem {
  itemId: string;
  seedName: string;
  variety: string;
  unit: string;
  requestedQty: number;
  approvedQty: number;
}

interface PartialApprovalReasonModalProps {
  open: boolean;
  items: PartialItem[];
  saving: boolean;
  onConfirm: (reason: PartialReason) => void;
  onCancel: () => void;
}

export function PartialApprovalReasonModal({
  open,
  items,
  saving,
  onConfirm,
  onCancel,
}: PartialApprovalReasonModalProps) {
  const [selected, setSelected] = useState<PartialReason | null>(null);

  const reducedItems = items.filter((i) => i.approvedQty < i.requestedQty);

  function handleOpenChange(o: boolean) {
    if (!o) {
      setSelected(null);
      onCancel();
    }
  }

  function handleConfirm() {
    if (!selected) return;
    onConfirm(selected);
    setSelected(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reason for Partial Approval</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Quantity diff table */}
          {reducedItems.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Item</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Requested</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Approved</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Not Supplied</th>
                  </tr>
                </thead>
                <tbody>
                  {reducedItems.map((item) => (
                    <tr key={item.itemId} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-medium">
                        <div>{item.seedName}</div>
                        {item.variety && <div className="text-xs text-muted-foreground">{item.variety}</div>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {item.requestedQty} {item.unit}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">
                        {item.approvedQty} {item.unit}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-orange-600">
                        {item.requestedQty - item.approvedQty} {item.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Reason cards */}
          <p className="text-sm text-muted-foreground">
            Why are some quantities not being supplied?
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setSelected("deliberate")}
              className={`flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors ${
                selected === "deliberate"
                  ? "border-foreground bg-muted"
                  : "border-border hover:border-foreground/40 hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`flex size-7 items-center justify-center rounded-full ${selected === "deliberate" ? "bg-foreground" : "bg-muted-foreground/10"}`}>
                  <BanIcon className={`size-3.5 ${selected === "deliberate" ? "text-background" : "text-muted-foreground"}`} />
                </div>
                <span className="text-sm font-semibold">Deliberate</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Admin decided to supply only this quantity. No further fulfillment is needed.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSelected("backorder")}
              className={`flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors ${
                selected === "backorder"
                  ? "border-foreground bg-muted"
                  : "border-border hover:border-foreground/40 hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`flex size-7 items-center justify-center rounded-full ${selected === "backorder" ? "bg-foreground" : "bg-muted-foreground/10"}`}>
                  <ClockIcon className={`size-3.5 ${selected === "backorder" ? "text-background" : "text-muted-foreground"}`} />
                </div>
                <span className="text-sm font-semibold">Backorder</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Stock is insufficient right now. Remaining quantities will be fulfilled when stock is available.
              </p>
            </button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!selected || saving}
            onClick={handleConfirm}
          >
            {saving ? "Approving…" : "Confirm Partial Approval"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
