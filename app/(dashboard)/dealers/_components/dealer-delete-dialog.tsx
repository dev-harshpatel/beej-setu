"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { DealerWithStaffRow } from "@/lib/database/dealers.queries";

interface DealerDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealer: DealerWithStaffRow | null;
  onSuccess: () => void;
}

export function DealerDeleteDialog({ open, onOpenChange, dealer, onSuccess }: DealerDeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!dealer) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/dealers/${dealer.id}`, { method: "DELETE" });
      if (res.ok) {
        onOpenChange(false);
        onSuccess();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Delete Dealer</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{dealer?.name}</strong>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
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
