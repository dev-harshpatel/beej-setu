"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { SeedProductWithCropRow } from "@/lib/database/seeds.queries";

interface SeedDeleteDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  seed: SeedProductWithCropRow | null;
  onSuccess: () => void;
}

export function SeedDeleteDialog({ open, onOpenChange, seed, onSuccess }: SeedDeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleDelete() {
    if (!seed) return;
    setError("");
    setLoading(true);
    try {
      const res  = await fetch(`/api/seeds/${seed.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) { setError(json.message ?? "Failed to delete"); return; }
      onSuccess();
      onOpenChange(false);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Product</DialogTitle>
          <DialogDescription>
            This will remove{" "}
            <span className="font-medium text-foreground">
              {seed?.crop.name} — {seed?.variety} ({seed?.pack_size})
            </span>{" "}
            from the catalogue. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
