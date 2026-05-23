import { CheckIcon, EyeIcon } from "lucide-react";
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

export interface PendingOrder {
  id: string;
  dealer: string;
  staff: string;
  date: string;
  items: number;
}

interface PendingOrdersTableProps {
  orders: PendingOrder[];
}

export function PendingOrdersTable({ orders }: PendingOrdersTableProps) {
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
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>
                <span className="font-medium text-sm">{order.dealer}</span>
                <span className="block text-xs text-muted-foreground sm:hidden">
                  {order.staff}
                </span>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                {order.staff}
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                {order.date}
              </TableCell>
              <TableCell className="text-center">
                <Badge className="bg-accent text-accent-foreground border-0 tabular-nums">
                  {order.items}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs gap-1"
                  >
                    <EyeIcon className="size-3" />
                    <span className="hidden sm:inline">View</span>
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 bg-foreground text-background hover:bg-foreground/90"
                  >
                    <CheckIcon className="size-3" />
                    <span className="hidden sm:inline">Approve</span>
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
