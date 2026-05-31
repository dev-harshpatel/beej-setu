"use client";

import { format } from "date-fns";
import { PencilIcon, Trash2Icon, BanknoteIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { CollectionWithRelations } from "@/lib/database/collections.queries";

type PaymentMode = "CASH" | "BANK_TRANSFER" | "UPI" | "CHEQUE";

const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  CASH: "Cash", BANK_TRANSFER: "Bank Transfer", UPI: "UPI", CHEQUE: "Cheque",
};

const BADGE_CLS: Record<PaymentMode, string> = {
  CASH:          "bg-success/10 text-success border-success/20",
  BANK_TRANSFER: "bg-info/10 text-info border-info/20",
  UPI:           "bg-purple-100 text-purple-700 border-purple-200",
  CHEQUE:        "bg-warning/10 text-warning border-warning/20",
};

function PaymentBadge({ mode }: { mode: PaymentMode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${BADGE_CLS[mode]}`}>
      {PAYMENT_MODE_LABELS[mode]}
    </span>
  );
}

interface Props {
  collections: CollectionWithRelations[];
  loading: boolean;
  onEdit:   (c: CollectionWithRelations) => void;
  onDelete: (c: CollectionWithRelations) => void;
}

export function CollectionsTable({ collections, loading, onEdit, onDelete }: Props) {
  const totalAmount = collections.reduce((s, c) => s + c.amount, 0);

  if (loading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead><TableHead>Dealer</TableHead>
            <TableHead>Mode</TableHead><TableHead className="text-right">Amount</TableHead>
            <TableHead className="w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
              <TableCell />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <BanknoteIcon className="size-8 opacity-40" />
        <p className="text-sm">No collections recorded yet</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Date</TableHead>
            <TableHead>Dealer</TableHead>
            <TableHead className="w-[140px]">Mode</TableHead>
            <TableHead className="text-right w-[130px]">Amount</TableHead>
            <TableHead className="w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {collections.map((col) => (
            <TableRow key={col.id}>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {format(new Date(col.collection_date), "dd MMM yyyy")}
              </TableCell>
              <TableCell>
                <p className="font-medium text-sm">{col.dealer?.name ?? "—"}</p>
                {col.notes && (
                  <p className="text-xs text-muted-foreground mt-0.5">{col.notes}</p>
                )}
              </TableCell>
              <TableCell><PaymentBadge mode={col.payment_mode as PaymentMode} /></TableCell>
              <TableCell className="text-right tabular-nums font-semibold text-sm">
                ₹{col.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onEdit(col)}
                    title="Edit"
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <PencilIcon className="size-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(col)}
                    title="Delete"
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2Icon className="size-3.5" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="border-t border-border px-4 py-2.5 sm:px-5 flex justify-end">
        <span className="text-xs text-muted-foreground">
          Total:&nbsp;
          <span className="font-semibold text-foreground tabular-nums">
            ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </span>
      </div>
    </>
  );
}
