"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROUTES } from "@/constants/routes.constants";
import { ORDER_STATUSES, type OrderStatusValue } from "@/constants/order-status.constants";
import type { OrderWithRelations } from "@/types/order.types";

type OrderUnit = "Bag" | "Packet" | "Box";
export type ItemEditState = { quantity: number | ""; unit: OrderUnit };

const STOCK_IMPACT_STATUSES: OrderStatusValue[] = [
  ORDER_STATUSES.APPROVED,
  ORDER_STATUSES.PARTIALLY_APPROVED,
  ORDER_STATUSES.GODOWN_DISPATCHED,
  ORDER_STATUSES.TRANSPORT_DISPATCHED,
  ORDER_STATUSES.SHIPPED,
];

interface OrderItemsTableProps {
  order: OrderWithRelations;
  mode: "view" | "edit";
  itemEdits: Record<string, ItemEditState>;
  canViewLedger: boolean;
  onQuantityChange: (itemId: string, value: number | "") => void;
  onUnitChange: (itemId: string, unit: OrderUnit) => void;
}

export function OrderItemsTable({
  order,
  mode,
  itemEdits,
  canViewLedger,
  onQuantityChange,
  onUnitChange,
}: OrderItemsTableProps) {
  const showBatchCol =
    mode === "view" && STOCK_IMPACT_STATUSES.includes(order.status as OrderStatusValue);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">
        Order Items ({order.items?.length ?? 0})
      </h3>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Seed</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground w-32">Unit</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Qty</th>
              {showBatchCol && (
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Batch</th>
              )}
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
                  {canViewLedger &&
                    STOCK_IMPACT_STATUSES.includes(order.status as OrderStatusValue) &&
                    item.seed_id && (
                      <a
                        href={`${ROUTES.STOCK.LEDGER}?seedId=${item.seed_id}`}
                        className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
                      >
                        View batch movement →
                      </a>
                    )}
                </td>

                <td className="px-3 py-2 text-muted-foreground w-32">
                  {mode === "edit" ? (
                    <Select
                      value={itemEdits[item.id]?.unit ?? item.unit ?? "Bag"}
                      onValueChange={(v) => onUnitChange(item.id, v as OrderUnit)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bag">Bag</SelectItem>
                        <SelectItem value="Packet">Packet</SelectItem>
                        <SelectItem value="Box">Box</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="block text-right">{item.unit ?? item.seed?.pack_size ?? "—"}</span>
                  )}
                </td>

                <td className="px-3 py-2 text-right font-medium tabular-nums">
                  {mode === "edit" ? (
                    <input
                      type="number"
                      min={0}
                      value={itemEdits[item.id]?.quantity ?? item.quantity}
                      onChange={(e) =>
                        onQuantityChange(
                          item.id,
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      className="w-16 rounded border border-input bg-transparent px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-ring focus:ring-1 focus:ring-ring/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  ) : (
                    item.quantity
                  )}
                </td>

                {showBatchCol && (
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {item.batch_number ?? "—"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
