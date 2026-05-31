"use client";

import { useState, useEffect } from "react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { CollectionWithRelations } from "@/lib/database/collections.queries";

type PaymentMode = "CASH" | "BANK_TRANSFER" | "UPI" | "CHEQUE";

const PAYMENT_MODE_OPTIONS: { value: PaymentMode; label: string }[] = [
  { value: "CASH",          label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "UPI",           label: "UPI" },
  { value: "CHEQUE",        label: "Cheque" },
];

interface Props {
  collection: CollectionWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, payload: {
    paymentMode: PaymentMode;
    amount: number;
    collectionDate: string;
    notes?: string | null;
  }) => Promise<void>;
}

export function CollectionsEditDialog({ collection, open, onOpenChange, onSave }: Props) {
  const [paymentMode,    setPaymentMode]    = useState<PaymentMode>("CASH");
  const [amount,         setAmount]         = useState("");
  const [collectionDate, setCollectionDate] = useState("");
  const [notes,          setNotes]          = useState("");
  const [error,          setError]          = useState("");
  const [saving,         setSaving]         = useState(false);

  useEffect(() => {
    if (collection) {
      setPaymentMode(collection.payment_mode as PaymentMode);
      setAmount(String(collection.amount));
      setCollectionDate(collection.collection_date);
      setNotes(collection.notes ?? "");
      setError("");
    }
  }, [collection]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setSaving(true);
    try {
      await onSave(collection!.id, {
        paymentMode,
        amount: parsed,
        collectionDate,
        notes: notes.trim() || null,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2Icon className="size-4 animate-spin mr-1" /> : null}
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
