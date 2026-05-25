"use client";

import { CheckIcon, PencilIcon, XIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { OrderStatusBadge } from "@/app/(dashboard)/orders/_components/order-status-badge";
import type { OrderWithRelations } from "@/types/order.types";

interface Props {
  order: OrderWithRelations | null;
  open: boolean;
  onClose: () => void;
  onEdit: (order: OrderWithRelations) => void;
  onApprove: (order: OrderWithRelations) => void;
}

export function PendingOrderDetailSheet({ order, open, onClose, onEdit, onApprove }: Props) {
  if (!order) return null;

  const items = order.items ?? [];

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[88vh] flex flex-col p-0 sm:max-w-lg sm:mx-auto sm:left-1/2 sm:-translate-x-1/2"
        showCloseButton={false}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Header */}
        <SheetHeader className="shrink-0 flex flex-row items-center justify-between px-5 pb-3 pt-1 border-b border-border">
          <div className="flex items-center gap-2.5 min-w-0">
            <SheetTitle className="font-mono text-sm font-semibold truncate">
              {order.order_number}
            </SheetTitle>
            <OrderStatusBadge status={order.status} />
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} className="shrink-0">
            <XIcon className="size-4" />
          </Button>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 min-h-0">
          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Dealer</p>
              <p className="font-medium">{order.dealer?.name ?? "—"}</p>
              {order.dealer?.contact && (
                <p className="text-xs text-muted-foreground mt-0.5">{order.dealer.contact}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Staff</p>
              <p className="font-medium">{order.staff?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Order Date</p>
              <p className="font-medium">
                {new Date(order.created_at).toLocaleDateString("en-IN", {
                  day: "2-digit", month: "short", year: "numeric",
                })}
              </p>
            </div>
            {order.delivery_date && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Delivery Date</p>
                <p className="font-medium">
                  {new Date(order.delivery_date).toLocaleDateString("en-IN", {
                    day: "2-digit", month: "short", year: "numeric",
                  })}
                </p>
              </div>
            )}
            {order.center && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Center</p>
                <p className="font-medium">{order.center}</p>
              </div>
            )}
            {order.transport_name && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Transport</p>
                <p className="font-medium">{order.transport_name}</p>
              </div>
            )}
            {order.delivery_center && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Delivery Center</p>
                <p className="font-medium">{order.delivery_center}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Items table */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2.5">
              Crop Details ({items.length} {items.length === 1 ? "item" : "items"})
            </p>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="py-2 pl-3 pr-2 text-left text-xs font-medium text-muted-foreground">Crop</th>
                    <th className="py-2 px-2 text-left text-xs font-medium text-muted-foreground">Variety</th>
                    <th className="py-2 px-2 text-center text-xs font-medium text-muted-foreground">Unit</th>
                    <th className="py-2 pl-2 pr-3 text-center text-xs font-medium text-muted-foreground">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id} className={idx % 2 !== 0 ? "bg-muted/20" : ""}>
                      <td className="py-2.5 pl-3 pr-2 font-medium">{item.seed?.crops?.name ?? "—"}</td>
                      <td className="py-2.5 px-2 text-muted-foreground text-xs">{item.seed?.variety ?? "—"}</td>
                      <td className="py-2.5 px-2 text-center text-xs text-muted-foreground">
                        {item.unit ?? item.seed?.pack_size ?? "—"}
                      </td>
                      <td className="py-2.5 pl-2 pr-3 text-center tabular-nums font-medium">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {order.notes && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm leading-relaxed">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="shrink-0 border-t border-border bg-card px-5 py-4 flex gap-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <Button
            variant="outline"
            className="flex-1 h-11 gap-2"
            onClick={() => { onClose(); onEdit(order); }}
          >
            <PencilIcon className="size-4" />
            Edit Order
          </Button>
          <Button
            className="flex-1 h-11 gap-2 bg-foreground text-background hover:bg-foreground/90"
            onClick={() => { onClose(); onApprove(order); }}
          >
            <CheckIcon className="size-4" />
            Approve
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
