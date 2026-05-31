"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import type { CollectionWithRelations } from "@/lib/database/collections.queries";
import { format } from "date-fns";

interface Props {
  collection: CollectionWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string) => Promise<void>;
}

export function CollectionsDeleteDialog({ collection, open, onOpenChange, onConfirm }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState("");

  async function handleDelete() {
    if (!collection) return;
    setDeleting(true);
    setError("");
    try {
      await onConfirm(collection.id);
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Collection</DialogTitle>
        </DialogHeader>

        {collection && (
          <p className="text-sm text-muted-foreground py-2">
            Delete the{" "}
            <span className="font-medium text-foreground">
              ₹{collection.amount.toLocaleString("en-IN")}
            </span>{" "}
            collection from{" "}
            <span className="font-medium text-foreground">
              {collection.dealer?.name ?? "—"}
            </span>{" "}
            on{" "}
            <span className="font-medium text-foreground">
              {format(new Date(collection.collection_date), "dd MMM yyyy")}
            </span>
            ? This cannot be undone.
          </p>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Loader2Icon className="size-4 animate-spin mr-1" /> : null}
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
