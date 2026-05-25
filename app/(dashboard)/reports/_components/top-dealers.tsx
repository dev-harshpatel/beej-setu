import { Skeleton } from "@/components/ui/skeleton";

export interface TopDealerRow {
  dealerId: string;
  name: string;
  territory: string | null;
  orderCount: number;
  confirmedCount: number;
}

interface Props { rows: TopDealerRow[]; loading: boolean }

export function TopDealers({ rows, loading }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold">Top Dealers</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Ranked by total orders placed</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <th className="px-4 py-2.5 text-left font-medium">#</th>
              <th className="px-4 py-2.5 text-left font-medium">Dealer</th>
              <th className="px-4 py-2.5 text-right font-medium">Orders</th>
              <th className="px-4 py-2.5 text-right font-medium hidden sm:table-cell">Confirmed+</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <td key={j} className="px-4 py-2.5"><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              ))
              : rows.length === 0
              ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No dealer data yet
                  </td>
                </tr>
              )
              : rows.map((row, idx) => (
                <tr key={row.dealerId} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 text-muted-foreground tabular-nums">{idx + 1}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{row.name}</div>
                    {row.territory && (
                      <div className="text-xs text-muted-foreground">{row.territory}</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{row.orderCount}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground hidden sm:table-cell">{row.confirmedCount}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
