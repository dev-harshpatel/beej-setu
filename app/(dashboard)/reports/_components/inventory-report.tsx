"use client";

import { useState } from "react";
import { ArrowUpDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface InventoryRow {
  seedId: string;
  cropName: string;
  variety: string;
  packSize: string;
  packetsPerBag: number;
  totalBags: number;
  totalLoosePackets: number;
  totalPacketsEquiv: number;
}

type SortKey = "cropName" | "totalPacketsEquiv" | "totalBags";

function stockStatus(total: number): { label: string; cls: string } {
  if (total === 0)  return { label: "Out of Stock", cls: "bg-destructive/10 text-destructive border-destructive/20" };
  if (total < 5)   return { label: "Critical",     cls: "bg-destructive/10 text-destructive border-destructive/20" };
  if (total < 20)  return { label: "Low",          cls: "bg-warning/10 text-warning border-warning/20" };
  return             { label: "OK",              cls: "bg-success/10 text-success border-success/20" };
}

interface Props { rows: InventoryRow[]; loading: boolean }

export function InventoryReport({ rows, loading }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("totalPacketsEquiv");
  const [asc, setAsc] = useState(false);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setAsc((v) => !v);
    else { setSortKey(key); setAsc(false); }
  }

  const sorted = [...rows].sort((a, b) => {
    const va = a[sortKey];
    const vb = b[sortKey];
    const cmp = typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number);
    return asc ? cmp : -cmp;
  });

  function SortBtn({ col, label }: { col: SortKey; label: string }) {
    return (
      <button
        onClick={() => toggleSort(col)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        <ArrowUpDownIcon className={cn("size-3", sortKey === col ? "opacity-100" : "opacity-40")} />
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold">Inventory Status</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {loading ? "Loading…" : `${rows.length} seed variants · sorted by highest stock`}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <th className="px-4 py-2.5 text-left font-medium">
                <SortBtn col="cropName" label="Crop" />
              </th>
              <th className="px-4 py-2.5 text-left font-medium">Variety</th>
              <th className="px-4 py-2.5 text-left font-medium hidden sm:table-cell">Pack Size</th>
              <th className="px-4 py-2.5 text-right font-medium hidden md:table-cell">Pkts/Bag</th>
              <th className="px-4 py-2.5 text-right font-medium">
                <SortBtn col="totalBags" label="Bags" />
              </th>
              <th className="px-4 py-2.5 text-right font-medium hidden sm:table-cell">Loose Pkts</th>
              <th className="px-4 py-2.5 text-right font-medium">
                <SortBtn col="totalPacketsEquiv" label="Total (pkts)" />
              </th>
              <th className="px-4 py-2.5 text-center font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-2.5"><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              ))
              : sorted.map((row) => {
                const { label, cls } = stockStatus(row.totalPacketsEquiv);
                return (
                  <tr key={row.seedId} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{row.cropName}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.variety}</td>
                    <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">{row.packSize}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums hidden md:table-cell">{row.packetsPerBag}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium">{row.totalBags}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums hidden sm:table-cell">{row.totalLoosePackets}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{row.totalPacketsEquiv.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={cn("inline-block rounded-full border px-2 py-0.5 text-xs font-medium", cls)}>
                        {label}
                      </span>
                    </td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
