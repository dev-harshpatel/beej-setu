"use client";

import { PackageIcon, XIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { SeedProductWithCropRow, SeedStockSummary } from "@/lib/database/seeds.queries";

function StockStatusBadge({ stock, packetsPerBag }: { stock: SeedStockSummary[]; packetsPerBag: number }) {
  const totalPackets = stock.reduce(
    (sum, s) => sum + s.bag_stock * packetsPerBag + s.packet_stock,
    0
  );

  if (totalPackets === 0) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-destructive/10 text-destructive">
        Out of Stock
      </span>
    );
  }
  if (totalPackets < packetsPerBag) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
        Low Stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-accent text-accent-foreground">
      In Stock
    </span>
  );
}

interface SeedDetailSheetProps {
  seed: SeedProductWithCropRow | null;
  open: boolean;
  canViewStock?: boolean;
  onClose: () => void;
}

export function SeedDetailSheet({ seed, open, canViewStock = false, onClose }: SeedDetailSheetProps) {
  if (!seed) return null;

  const stock = seed.stock ?? [];
  const totalBags = stock.reduce((sum, s) => sum + s.bag_stock, 0);
  const totalPackets = stock.reduce((sum, s) => sum + s.packet_stock, 0);

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[80vh] flex flex-col p-0 sm:max-w-lg sm:mx-auto sm:left-1/2 sm:-translate-x-1/2"
        showCloseButton={false}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Header */}
        <SheetHeader className="shrink-0 flex flex-row items-center justify-between px-5 pb-3 pt-1 border-b border-border">
          <div className="flex flex-col gap-0.5 min-w-0">
            <SheetTitle className="text-base font-semibold truncate">{seed.crop.name}</SheetTitle>
            {seed.variety && (
              <p className="text-sm text-muted-foreground truncate">{seed.variety}</p>
            )}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} className="shrink-0">
            <XIcon className="size-4" />
          </Button>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 min-h-0">
          {/* Details grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Pack Size</p>
              <p className="font-medium">{seed.pack_size ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Packets / Bag</p>
              <p className="font-medium">{seed.packets_per_bag}</p>
            </div>
            {canViewStock && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Status</p>
                <StockStatusBadge stock={stock} packetsPerBag={seed.packets_per_bag} />
              </div>
            )}
          </div>

          {canViewStock && stock.length > 0 && (
            <>
              <Separator />

              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <PackageIcon className="size-3.5 text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Stock
                  </p>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-center">
                    <p className="text-2xl font-bold tabular-nums">{totalBags}</p>
                    <p className="text-xs text-muted-foreground">Bags</p>
                  </div>
                  <div className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-center">
                    <p className="text-2xl font-bold tabular-nums">{totalPackets}</p>
                    <p className="text-xs text-muted-foreground">Packets</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
