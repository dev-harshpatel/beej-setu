"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import type { SeedStockWithDetails } from "@/lib/database/stock.queries";
import type { SeedProductWithCropRow } from "@/lib/database/seeds.queries";

interface StockFormDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  stock: SeedStockWithDetails | null;
  seedProducts: SeedProductWithCropRow[];
  onSuccess: () => void;
}

export function StockFormDialog({ open, onOpenChange, stock, seedProducts, onSuccess }: StockFormDialogProps) {
  const isEdit = !!stock;
  const [seedId, setSeedId]           = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [bagStock, setBagStock]       = useState("0");
  const [packetStock, setPacketStock] = useState("0");
  const [notes, setNotes]             = useState("");
  const [movementDate, setMovementDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  useEffect(() => {
    if (open) {
      setSeedId(stock?.seed_id ?? "");
      setBatchNumber(stock?.batch_number ?? "");
      setBagStock(String(stock?.bag_stock ?? 0));
      setPacketStock(String(stock?.packet_stock ?? 0));
      setNotes(stock?.notes ?? "");
      setMovementDate(stock?.movement_date ?? new Date().toISOString().slice(0, 10));
      setError("");
    }
  }, [open, stock]);

  const selectedSeed = seedProducts.find((s) => s.id === seedId);
  const packetsPerBag = selectedSeed?.packets_per_bag ?? stock?.seed_product.packets_per_bag ?? 0;
  const totalPackets  = (Number(bagStock) || 0) * packetsPerBag + (Number(packetStock) || 0);

  async function handleSubmit() {
    setError("");
    if (!isEdit && !seedId) { setError("Select a seed product"); return; }
    if (!batchNumber.trim()) { setError("Batch number is required"); return; }

    setLoading(true);
    try {
      const url    = isEdit ? `/api/stock/${stock!.id}` : "/api/stock";
      const method = isEdit ? "PATCH" : "POST";
      const body   = isEdit
        ? { bagStock: Number(bagStock), packetStock: Number(packetStock), notes: notes || null, movementDate: movementDate || null }
        : { seedId, batchNumber: batchNumber.trim(), bagStock: Number(bagStock), packetStock: Number(packetStock), notes: notes || null, movementDate: movementDate || null };

      const res  = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok || !json.success) { setError(json.message ?? "Failed to save"); return; }
      onSuccess();
      onOpenChange(false);
    } catch { setError("Something went wrong"); }
    finally  { setLoading(false); }
  }

  const seedItems = seedProducts.map((s) => ({
    value: s.id,
    label: `${s.crop.name} — ${s.variety} (${s.pack_size})`,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Update Stock" : "Add Stock Batch"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {isEdit ? (
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
              <p className="font-medium">{stock!.seed_product.crop.name} — {stock!.seed_product.variety}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stock!.seed_product.pack_size} · Batch {stock!.batch_number} · {packetsPerBag} pkts/bag
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label>Seed Product <span className="text-destructive">*</span></Label>
              <Combobox
                items={seedItems}
                value={seedId}
                onValueChange={setSeedId}
                placeholder="Select seed product"
                searchPlaceholder="Search products…"
                emptyText="No products found"
              />
              {selectedSeed && (
                <p className="text-xs text-muted-foreground">{selectedSeed.packets_per_bag} packets per bag</p>
              )}
            </div>
          )}

          {!isEdit && (
            <div className="flex flex-col gap-1.5">
              <Label>Batch Number <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. B2025-002"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Bag Stock</Label>
              <Input
                type="number" min={0}
                value={bagStock}
                onChange={(e) => setBagStock(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Loose Packets</Label>
              <Input
                type="number" min={0}
                value={packetStock}
                onChange={(e) => setPacketStock(e.target.value)}
              />
            </div>
          </div>

          {packetsPerBag > 0 && (
            <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
              Total = {Number(bagStock) || 0} bags × {packetsPerBag} pkts + {Number(packetStock) || 0} loose
              = <span className="font-semibold text-foreground">{totalPackets} packets</span>
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Stock Date</Label>
            <Input
              type="date"
              value={movementDate}
              onChange={(e) => setMovementDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">The date the stock was physically received or adjusted.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Notes / Reason</Label>
            <textarea
              className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              placeholder="e.g. Received from supplier, correcting counting error…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button
            size="sm" onClick={handleSubmit} disabled={loading}
            className="bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent)]/80"
          >
            {isEdit ? "Update" : "Add Batch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
