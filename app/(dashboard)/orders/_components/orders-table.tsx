"use client";

import {
  CheckCircleIcon,
  ClipboardListIcon,
  MoreHorizontalIcon,
  PencilIcon,
  ShoppingBagIcon,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusBadge } from "./order-status-badge";
import type { OrderWithRelations } from "@/types/order.types";


interface OrdersTableProps {
  orders: OrderWithRelations[];
  loading: boolean;
  onEdit: (order: OrderWithRelations) => void;
  onConfirm: (order: OrderWithRelations) => void;
  onCreateChallan: (order: OrderWithRelations) => void;
}

export function OrdersTable({
  orders,
  loading,
  onEdit,
  onConfirm,
  onCreateChallan,
}: OrdersTableProps) {
  if (loading) {
    return (
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Dealer</TableHead>
              <TableHead className="hidden md:table-cell">Staff</TableHead>
              <TableHead className="hidden lg:table-cell">Center</TableHead>
              <TableHead className="hidden sm:table-cell">Date</TableHead>
              <TableHead className="hidden sm:table-cell">Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-8" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-7 w-20 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border py-16 text-muted-foreground">
        <ShoppingBagIcon className="size-8 opacity-40" />
        <p className="text-sm">No orders found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Dealer</TableHead>
            <TableHead className="hidden md:table-cell">Staff</TableHead>
            <TableHead className="hidden lg:table-cell">Center</TableHead>
            <TableHead className="hidden sm:table-cell">Date</TableHead>
            <TableHead className="hidden sm:table-cell">Items</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-mono text-xs font-medium">
                {order.order_number}
              </TableCell>
              <TableCell className="font-medium">
                {order.dealer?.name ?? "—"}
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                {order.staff?.name ?? "—"}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                {order.dealer?.territory ?? "—"}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-sm text-muted-foreground whitespace-nowrap">
                {new Date(order.created_at).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                {order.items?.length ?? 0}
              </TableCell>
              <TableCell>
                <OrderStatusBadge status={order.status} />
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1.5">
                  {order.status === "PENDING" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="hidden sm:flex h-7 text-xs"
                      onClick={() => onConfirm(order)}
                    >
                      <CheckCircleIcon className="size-3.5" />
                      Confirm
                    </Button>
                  )}
                  {order.status === "CONFIRMED" && (
                    <Button
                      size="sm"
                      className="hidden sm:flex h-7 text-xs bg-accent text-accent-foreground hover:bg-accent/80 border-0"
                      onClick={() => onCreateChallan(order)}
                    >
                      <ClipboardListIcon className="size-3.5" />
                      Challan
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
                      aria-label="More actions"
                    >
                      <MoreHorizontalIcon className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(order)}>
                        <PencilIcon className="size-4" />
                        Edit
                      </DropdownMenuItem>
                      {order.status === "PENDING" && (
                        <DropdownMenuItem
                          className="sm:hidden"
                          onClick={() => onConfirm(order)}
                        >
                          <CheckCircleIcon className="size-4" />
                          Confirm order
                        </DropdownMenuItem>
                      )}
                      {order.status === "CONFIRMED" && (
                        <DropdownMenuItem
                          className="sm:hidden"
                          onClick={() => onCreateChallan(order)}
                        >
                          <ClipboardListIcon className="size-4" />
                          Create challan
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
