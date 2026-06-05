"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangleIcon, ArrowRightIcon, PackageIcon } from "lucide-react";
import type { SeedAvailability } from "@/app/api/stock/availability/route";
import type { OrderWithRelations } from "@/types/order.types";

export function OrderStockPanel({ order }: { order: OrderWithRelations }) {
  const seedIds = (order.items ?? [])
    .map((i) => i.seed_id)
    .filter((id): id is string => !!id);

  const { data: availability, isLoading } = useQuery<SeedAvailability[]>({
    queryKey: ["stock-availability", seedIds],
    queryFn: async () => {
      const res  = await fetch(`/api/stock/availability?seedIds=${seedIds.join(",")}`);
      const json = await res.json();
      if (!json.success) throw new Error("Failed to fetch stock");
      return json.data as SeedAvailability[];
    },
    enabled: seedIds.length > 0,
    staleTime: 30_000,
  });

  const stockMap = Object.fromEntries((availability ?? []).map((s) => [s.seed_id, s]));

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
      <div className="flex items-center gap-2 border-b border-amber-200 dark:border-amber-900 px-3 py-2">
        <PackageIcon className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
          Stock Availability Preview
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
          <span className="size-3 animate-spin rounded-full border border-muted-foreground border-t-transparent" />
          Checking stock…
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-amber-100 dark:divide-amber-900/60">
          {(order.items ?? []).map((item) => {
            const stock  = item.seed_id ? stockMap[item.seed_id] : undefined;
            const unit   = (item.unit ?? "Bag") as "Bag" | "Packet";
            const ppb    = stock?.packets_per_bag ?? 1;

            const orderBags    = unit === "Bag"    ? item.quantity : 0;
            const orderPackets = unit === "Packet" ? item.quantity : 0;
            const availBags    = stock?.bag_stock    ?? 0;
            const availPackets = stock?.packet_stock ?? 0;

            const availTotal = availBags * ppb + availPackets;
            const orderTotal = orderBags * ppb + orderPackets;
            const afterTotal = availTotal - orderTotal;
            const sufficient = afterTotal >= 0;

            const afterBags = sufficient
              ? Math.floor(afterTotal / ppb)
              : Math.floor(Math.abs(afterTotal) / ppb);
            const afterPkts = sufficient
              ? afterTotal % ppb
              : Math.abs(afterTotal) % ppb;

            return (
              <div key={item.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-3 py-2.5 text-xs">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{item.seed?.crops?.name ?? "—"}</p>
                  {item.seed?.variety && (
                    <p className="text-muted-foreground truncate">{item.seed.variety}</p>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-muted-foreground leading-tight">Available</p>
                  {stock ? (
                    <p className="font-semibold tabular-nums text-foreground">
                      {availBags > 0 && <span>{availBags} bag{availBags !== 1 ? "s" : ""}</span>}
                      {availBags > 0 && availPackets > 0 && <span className="text-muted-foreground"> + </span>}
                      {availPackets > 0 && <span>{availPackets} pkt{availPackets !== 1 ? "s" : ""}</span>}
                      {availBags === 0 && availPackets === 0 && <span className="text-destructive">0</span>}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">—</p>
                  )}
                </div>

                <ArrowRightIcon className="size-3 text-muted-foreground shrink-0" />

                <div className="text-right min-w-[5rem]">
                  <p className="text-muted-foreground leading-tight">After</p>
                  {stock ? (
                    <p className={`font-semibold tabular-nums flex items-center justify-end gap-1 ${sufficient ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                      {!sufficient && <AlertTriangleIcon className="size-3 shrink-0" />}
                      {sufficient ? (
                        <>
                          {afterBags > 0 && <span>{afterBags} bag{afterBags !== 1 ? "s" : ""}</span>}
                          {afterBags > 0 && afterPkts > 0 && <span className="text-muted-foreground">+</span>}
                          {afterPkts > 0 && <span>{afterPkts} pkt{afterPkts !== 1 ? "s" : ""}</span>}
                          {afterTotal === 0 && <span>0</span>}
                        </>
                      ) : (
                        <span>Short {afterBags > 0 ? `${afterBags}bg` : ""}{afterPkts > 0 ? ` ${afterPkts}pk` : ""}</span>
                      )}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">—</p>
                  )}
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between px-3 py-2 bg-amber-100/60 dark:bg-amber-900/20">
            <span className="text-xs text-amber-700 dark:text-amber-400">
              Order deduction: {(order.items ?? []).map((i) => `${i.quantity} ${i.unit ?? "Bag"}`).join(", ")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
