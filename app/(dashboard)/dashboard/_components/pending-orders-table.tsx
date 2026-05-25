import { CheckIcon, PencilIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OrderWithRelations } from "@/types/order.types";

interface PendingOrdersTableProps {
  orders: OrderWithRelations[];
  onApprove: (order: OrderWithRelations) => void;
  onEdit: (order: OrderWithRelations) => void;
  onRowClick: (order: OrderWithRelations) => void;
}

export function PendingOrdersTable({ orders, onApprove, onEdit, onRowClick }: PendingOrdersTableProps) {
  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        No pending orders
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dealer</TableHead>
            <TableHead className="hidden sm:table-cell">Staff</TableHead>
            <TableHead className="hidden md:table-cell">Date</TableHead>
            <TableHead className="text-center">Items</TableHead>
            <TableHead className="text-right hidden sm:table-cell">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow
              key={order.id}
              className="cursor-pointer active:bg-muted/60"
              onClick={() => onRowClick(order)}
            >
              <TableCell>
                <span className="font-medium text-sm">{order.dealer?.name ?? "—"}</span>
                <span className="block text-xs text-muted-foreground font-mono mt-0.5">
                  {order.order_number}
                </span>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                {order.staff?.name ?? "—"}
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground whitespace-nowrap">
                {new Date(order.created_at).toLocaleDateString("en-IN", {
                  day: "2-digit", month: "short", year: "numeric",
                })}
              </TableCell>
              <TableCell className="text-center">
                <Badge className="bg-accent text-accent-foreground border-0 tabular-nums">
                  {order.items?.length ?? 0}
                </Badge>
              </TableCell>
              {/* Desktop-only inline actions */}
              <TableCell className="text-right hidden sm:table-cell">
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={(e) => { e.stopPropagation(); onEdit(order); }}
                  >
                    <PencilIcon className="size-3" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 bg-foreground text-background hover:bg-foreground/90"
                    onClick={(e) => { e.stopPropagation(); onApprove(order); }}
                  >
                    <CheckIcon className="size-3" />
                    Approve
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
