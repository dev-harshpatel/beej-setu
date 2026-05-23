"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { SeedStockWithDetails } from "@/lib/database/stock.queries";

interface StockDeleteDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  stock: SeedStockWithDetails | null;
  onSuccess: () => void;
}

export function StockDeleteDialog({ open, onOpenChange, stock, onSuccess }: StockDeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleDelete() {
    if (!stock) return;
    setLoading(true); setError("");
    try {
      const res  = await fetch(`/api/stock/${stock.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) { setError(json.message ?? "Failed to delete"); return; }
      onSuccess();
      onOpenChange(false);
    } catch { setError("Something went wrong"); }
    finally  { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Batch</DialogTitle>
        </DialogHeader>
        <div className="py-2 text-sm text-muted-foreground">
          Delete batch <span className="font-medium text-foreground">{stock?.batch_number}</span> for{" "}
          <span className="font-medium text-foreground">
            {stock?.seed_product.crop.name} — {stock?.seed_product.variety}
          </span>? This cannot be undone.
        </div>
        {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
