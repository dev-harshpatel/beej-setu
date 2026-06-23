import { ChevronRightIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { SeedProductWithCropRow, SeedStockSummary } from "@/lib/database/seeds.queries";

function StockStatusBadge({ stock, packetsPerBag }: { stock: SeedStockSummary[]; packetsPerBag: number }) {
  const totalPackets = stock.reduce(
    (sum, s) => sum + s.bag_stock * packetsPerBag + s.packet_stock,
    0
  );

  if (totalPackets === 0) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-destructive/10 text-destructive">
        Out of Stock
      </span>
    );
  }
  if (totalPackets < packetsPerBag) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
        Low Stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-accent text-accent-foreground">
      In Stock
    </span>
  );
}

interface SeedsTableProps {
  products: SeedProductWithCropRow[];
  loading: boolean;
  canViewStock?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onRowClick?: (product: SeedProductWithCropRow) => void;
  onEdit?: (product: SeedProductWithCropRow) => void;
  onDelete?: (product: SeedProductWithCropRow) => void;
}

export function SeedsTable({ products, loading, canViewStock = false, canEdit = false, canDelete = false, onRowClick, onEdit, onDelete }: SeedsTableProps) {
  const hasActions = canEdit || canDelete;

  const headerRow = (
    <TableHeader className="sticky top-0 z-10 [&_th]:bg-card">
      <TableRow>
        <TableHead>Crop</TableHead>
        <TableHead>Variety</TableHead>
        <TableHead className="hidden sm:table-cell text-right">Pack Size</TableHead>
        <TableHead className="hidden sm:table-cell text-right">Pkts / Bag</TableHead>
        {canViewStock && <TableHead className="hidden sm:table-cell">Status</TableHead>}
        {/* Actions column (desktop) / mobile detail trigger */}
        <TableHead className="w-10 sm:w-20" />
      </TableRow>
    </TableHeader>
  );

  if (loading) {
    return (
      <div className="h-full overflow-auto rounded-lg border border-border">
        <table className="w-full caption-bottom text-sm">
          {headerRow}
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell className="hidden sm:table-cell text-right"><Skeleton className="h-4 w-14 ml-auto" /></TableCell>
                <TableCell className="hidden sm:table-cell text-right"><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                {canViewStock && <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-14 rounded-full" /></TableCell>}
                <TableCell className="w-10 sm:w-20" />
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto rounded-lg border border-border">
      <table className="w-full caption-bottom text-sm">
        {headerRow}
        <TableBody>
          {products.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.crop.name}</TableCell>
              <TableCell>{p.variety}</TableCell>
              <TableCell className="hidden sm:table-cell text-right tabular-nums font-medium">{p.pack_size}</TableCell>
              <TableCell className="hidden sm:table-cell text-right tabular-nums text-muted-foreground">{p.packets_per_bag}</TableCell>
              {canViewStock && (
                <TableCell className="hidden sm:table-cell">
                  <StockStatusBadge stock={p.stock ?? []} packetsPerBag={p.packets_per_bag} />
                </TableCell>
              )}
              <TableCell className="w-10 sm:w-20 pr-2">
                {/* Desktop: edit + delete buttons */}
                {hasActions ? (
                  <div className="hidden sm:flex items-center justify-end gap-1">
                    {canEdit && (
                      <Button variant="ghost" size="icon-sm" onClick={() => onEdit?.(p)} aria-label="Edit">
                        <PencilIcon className="size-3.5 text-muted-foreground" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon-sm" onClick={() => onDelete?.(p)} aria-label="Delete">
                        <Trash2Icon className="size-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ) : null}
                {/* Mobile: chevron to detail sheet */}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="sm:hidden"
                  onClick={() => onRowClick?.(p)}
                >
                  <ChevronRightIcon className="size-4 text-muted-foreground" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </table>
    </div>
  );
}
