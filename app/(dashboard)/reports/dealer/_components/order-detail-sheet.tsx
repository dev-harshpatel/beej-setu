"use client";

import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { OrderStatusBadge } from "@/app/(dashboard)/orders/_components/order-status-badge";
import { formatDateMedium } from "@/lib/utils";
import type { OrderWithRelations } from "@/types/order.types";
import type { OrderStatusValue } from "@/constants/order-status.constants";

interface Props {
  order: OrderWithRelations | null;
  onClose: () => void;
}

export function OrderDetailSheet({ order, onClose }: Props) {
  return (
    <Sheet open={!!order} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-center justify-between border-b px-4 py-3 gap-0">
          <div className="flex items-center gap-3 min-w-0">
            <SheetTitle className="font-mono text-sm font-semibold truncate">
              {order?.order_number ?? "Order Details"}
            </SheetTitle>
            {order && <OrderStatusBadge status={order.status as OrderStatusValue} />}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <XIcon className="size-4" />
          </Button>
        </SheetHeader>

        {order && (
          <div className="flex flex-col gap-5 px-4 py-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Date</span>
                <span className="text-sm font-medium">{formatDateMedium(order.created_at)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Dealer</span>
                <span className="text-sm font-medium">{order.dealer?.name ?? "—"}</span>
                {order.dealer?.territory && (
                  <span className="text-xs text-muted-foreground">{order.dealer.territory}</span>
                )}
              </div>
              {order.staff && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Staff</span>
                  <span className="text-sm font-medium">{order.staff.name}</span>
                </div>
              )}
              {order.transport_name && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Transport</span>
                  <span className="text-sm font-medium">{order.transport_name}</span>
                </div>
              )}
            </div>

            <Separator />

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">Order Items ({order.items?.length ?? 0})</h3>
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
                            <div className="text-xs text-muted-foreground">
                              {item.seed.variety}{item.seed.pack_size ? ` · ${item.seed.pack_size}` : ""}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{item.unit ?? "—"}</td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {order.notes && (
              <>
                <Separator />
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm">{order.notes}</p>
                </div>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
