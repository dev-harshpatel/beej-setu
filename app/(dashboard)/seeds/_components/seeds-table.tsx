import { Skeleton } from "@/components/ui/skeleton";
import {
  TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { SeedProductWithCropRow } from "@/lib/database/seeds.queries";

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
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.status === "ACTIVE"
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {p.status === "ACTIVE" ? "Active" : "Inactive"}
                  </span>
                </TableCell>
              </TableRow>
          ))}
        </TableBody>
      </table>
    </div>
  );
}
