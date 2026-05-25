"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { BatchWithStatus } from "@/lib/database/stock-movements.queries";

interface Props {
  batches: BatchWithStatus[];
  loading: boolean;
  selectedBatchNumber: string | null;
  onSelect: (batch: BatchWithStatus) => void;
}

const STATUS_BADGE: Record<BatchWithStatus["batch_status"], string> = {
  ACTIVE:   "bg-emerald-100 text-emerald-700",
  LOW:      "bg-amber-100 text-amber-700",
  DEPLETED: "bg-muted text-muted-foreground",
};

export function BatchList({ batches, loading, selectedBatchNumber, onSelect }: Props) {
  const header = (
    <TableHeader className="sticky top-0 z-10 [&_th]:bg-card">
      <TableRow>
        <TableHead>Batch #</TableHead>
        <TableHead>Crop</TableHead>
        <TableHead>Variety</TableHead>
        <TableHead>Pack Size</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="text-right">Bags</TableHead>
        <TableHead className="text-right">Pkts</TableHead>
        <TableHead className="hidden sm:table-cell">First Entry</TableHead>
      </TableRow>
    </TableHeader>
  );

  if (loading) {
    return (
      <div className="overflow-auto rounded-lg border border-border max-h-64">
        <table className="w-full caption-bottom text-sm">
          {header}
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 8 }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="rounded-lg border border-border flex items-center justify-center h-32 text-sm text-muted-foreground">
        No batches match the selected filters.
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border border-border max-h-64">
      <table className="w-full caption-bottom text-sm">
        {header}
        <TableBody>
          {batches.map((b) => {
            const isSelected = b.batch_number === selectedBatchNumber && b.seed_id === batches.find(x => x.batch_number === selectedBatchNumber)?.seed_id;
            return (
              <TableRow
                key={`${b.seed_id}-${b.batch_number}`}
                onClick={() => onSelect(b)}
                className={cn(
                  "cursor-pointer hover:bg-muted/50 transition-colors",
                  isSelected && "bg-accent/30 hover:bg-accent/40"
                )}
              >
                <TableCell className="font-mono text-xs">{b.batch_number}</TableCell>
                <TableCell className="font-medium">{b.crop_name}</TableCell>
                <TableCell>{b.variety}</TableCell>
                <TableCell className="text-muted-foreground">{b.pack_size}</TableCell>
                <TableCell>
                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", STATUS_BADGE[b.batch_status])}>
                    {b.batch_status}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{b.bag_stock}</TableCell>
                <TableCell className="text-right tabular-nums">{b.packet_stock}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                  {b.first_movement_date
                    ? new Date(b.first_movement_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                    : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </table>
    </div>
  );
}
