import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PencilIcon, Trash2Icon, HistoryIcon } from "lucide-react";
import { ROUTES } from "@/constants/routes.constants";
import type { SeedStockWithDetails } from "@/lib/database/stock.queries";

interface StockTableProps {
  rows: SeedStockWithDetails[];
  loading: boolean;
  canManage: boolean;
  onEdit: (row: SeedStockWithDetails) => void;
  onDelete: (row: SeedStockWithDetails) => void;
}

export function StockTable({ rows, loading, canManage, onEdit, onDelete }: StockTableProps) {
  const router = useRouter();
  const header = (
    <TableHeader className="sticky top-0 z-10 [&_th]:bg-card">
      <TableRow>
        <TableHead>Crop</TableHead>
        <TableHead>Variety</TableHead>
        <TableHead>Pack Size</TableHead>
        <TableHead>Batch</TableHead>
        <TableHead className="text-right">Bags</TableHead>
        <TableHead className="text-right">Packets</TableHead>
        <TableHead className="text-right">Total Pkts</TableHead>
        <TableHead className="hidden lg:table-cell">Last Updated By</TableHead>
        <TableHead className="hidden lg:table-cell">Updated</TableHead>
        {canManage && <TableHead className="w-16" />}
      </TableRow>
    </TableHeader>
  );

  if (loading) {
    return (
      <div className="overflow-auto rounded-lg border border-border max-h-[420px] sm:max-h-[520px] lg:max-h-[620px]">
        <table className="w-full caption-bottom text-sm">
          {header}
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: canManage ? 10 : 9 }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                ))}
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
        {header}
        <TableBody>
          {rows.map((r) => {
            const total = r.bag_stock * r.seed_product.packets_per_bag + r.packet_stock;
            const low   = total < r.seed_product.packets_per_bag;
            return (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.seed_product.crop.name}</TableCell>
                <TableCell>{r.seed_product.variety}</TableCell>
                <TableCell className="text-muted-foreground">{r.seed_product.pack_size}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{r.batch_number}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">{r.bag_stock}</TableCell>
                <TableCell className="text-right tabular-nums">{r.packet_stock}</TableCell>
                <TableCell className={`text-right tabular-nums font-semibold ${low ? "text-destructive" : ""}`}>
                  {total}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                  {r.updater?.name ?? "—"}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                  {new Date(r.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </TableCell>
                {canManage && (
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => router.push(`${ROUTES.STOCK.LEDGER}?seedId=${r.seed_id}&batch=${r.batch_number}`)}
                        title="View ledger"
                        className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
                      >
                        <HistoryIcon className="size-3.5" />
                      </button>
                      <button
                        onClick={() => onEdit(r)}
                        className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
                      >
                        <PencilIcon className="size-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(r)}
                        className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <Trash2Icon className="size-3.5" />
                      </button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </table>
    </div>
  );
}
