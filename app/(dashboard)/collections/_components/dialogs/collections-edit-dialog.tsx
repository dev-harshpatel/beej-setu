"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { CollectionWithRelations } from "@/lib/database/collections.queries";
import { PAYMENT_MODE_OPTIONS } from "@/constants/payment.constants";
import type { PaymentMode } from "@/types/database.types";

export interface CollectionUpdateValues {
  paymentMode: PaymentMode;
  amount: number;
  collectionDate: string;
  notes?: string | null;
}

interface Props {
  collection: CollectionWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, payload: CollectionUpdateValues) => Promise<void>;
}

export function CollectionsEditDialog({ collection, open, onOpenChange, onSave }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Collection</DialogTitle>
          {collection?.dealer && (
            <p className="text-sm text-muted-foreground">
              {collection.dealer.name}
            </p>
          )}
        </DialogHeader>

        {/* Keyed by id so the form state re-initializes per collection */}
        {collection && (
          <EditCollectionForm
            key={collection.id}
            collection={collection}
            onSave={onSave}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditCollectionForm({
  collection, onSave, onClose,
}: {
  collection: CollectionWithRelations;
  onSave: (id: string, payload: CollectionUpdateValues) => Promise<void>;
  onClose: () => void;
}) {
  const [paymentMode,    setPaymentMode]    = useState<PaymentMode>(collection.payment_mode as PaymentMode);
  const [amount,         setAmount]         = useState(String(collection.amount));
  const [collectionDate, setCollectionDate] = useState(collection.collection_date);
  const [notes,          setNotes]          = useState(collection.notes ?? "");
  const [error,          setError]          = useState("");
  const [saving,         setSaving]         = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setSaving(true);
    try {
      await onSave(collection.id, {
        paymentMode,
        amount: parsed,
        collectionDate,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-3 py-2">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Mode of Payment</Label>
          <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as PaymentMode)}>
            <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAYMENT_MODE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Amount (₹)</Label>
          <Input
            type="number" min="0.01" step="0.01" className="h-9"
            value={amount} onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Date</Label>
          <DatePicker value={collectionDate} onChange={setCollectionDate} className="h-9 w-full" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Notes (optional)</Label>
          <Input className="h-9" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <DialogFooter className="mt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2Icon className="size-4 animate-spin mr-1" /> : null}
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}
