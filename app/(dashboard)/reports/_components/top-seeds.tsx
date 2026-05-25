import { Skeleton } from "@/components/ui/skeleton";

export interface TopSeedRow {
  seedId: string;
  cropName: string;
  variety: string;
  packSize: string;
  orderedBags: number;
  orderedPackets: number;
  totalPacketsEquiv: number;
  orderCount: number;
}

interface Props { rows: TopSeedRow[]; loading: boolean }

export function TopSeeds({ rows, loading }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold">Most Demanded Seeds</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Based on confirmed, dispatched & delivered orders
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <th className="px-4 py-2.5 text-left font-medium">#</th>
              <th className="px-4 py-2.5 text-left font-medium">Seed</th>
              <th className="px-4 py-2.5 text-right font-medium hidden sm:table-cell">Bags</th>
              <th className="px-4 py-2.5 text-right font-medium hidden sm:table-cell">Pkts</th>
              <th className="px-4 py-2.5 text-right font-medium">Total Equiv</th>
              <th className="px-4 py-2.5 text-right font-medium hidden md:table-cell">Orders</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-2.5"><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              ))
              : rows.length === 0
              ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No order data yet
                  </td>
                </tr>
              )
              : rows.map((row, idx) => (
                <tr key={row.seedId} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 text-muted-foreground tabular-nums">{idx + 1}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{row.cropName}</div>
                    <div className="text-xs text-muted-foreground">{row.variety} · {row.packSize}</div>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums hidden sm:table-cell">{row.orderedBags}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums hidden sm:table-cell">{row.orderedPackets}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{row.totalPacketsEquiv.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground hidden md:table-cell">{row.orderCount}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
