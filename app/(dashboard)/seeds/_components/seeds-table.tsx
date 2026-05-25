import { Skeleton } from "@/components/ui/skeleton";
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
}

export function SeedsTable({ products, loading }: SeedsTableProps) {
  const headerRow = (
    <TableHeader className="sticky top-0 z-10 [&_th]:bg-card">
      <TableRow>
        <TableHead>Crop</TableHead>
        <TableHead>Variety</TableHead>
        <TableHead className="text-right">Pack Size</TableHead>
        <TableHead className="text-right">Pkts / Bag</TableHead>
        <TableHead className="hidden sm:table-cell">Status</TableHead>
      </TableRow>
    </TableHeader>
  );

  if (loading) {
    return (
      <div className="overflow-auto rounded-lg border border-border max-h-[420px] sm:max-h-[520px] lg:max-h-[620px]">
        <table className="w-full caption-bottom text-sm">
          {headerRow}
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-14 ml-auto" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border border-border max-h-[420px] sm:max-h-[520px] lg:max-h-[620px]">
      <table className="w-full caption-bottom text-sm">
        {headerRow}
        <TableBody>
          {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.crop.name}</TableCell>
                <TableCell>{p.variety}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">{p.pack_size}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{p.packets_per_bag}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <StockStatusBadge stock={p.stock ?? []} packetsPerBag={p.packets_per_bag} />
                </TableCell>
              </TableRow>
          ))}
        </TableBody>
      </table>
    </div>
  );
}
