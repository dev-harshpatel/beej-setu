"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { WhatsAppSharePanel } from "@/app/(dashboard)/orders/_components/whatsapp-share-panel";
import { buildCollectionWhatsAppMessage } from "@/lib/whatsapp";
import { PAYMENT_MODE_OPTIONS } from "@/constants/payment.constants";
import { collectionsService } from "@/services/collections.service";
import { getApiErrorMessage } from "@/lib/api-client";
import type { PaymentMode } from "@/types/database.types";

const TODAY = format(new Date(), "yyyy-MM-dd");

interface CollectionFormProps {
  dealerOptions: { value: string; label: string }[];
  onCreated: () => void;
}

export function CollectionForm({ dealerOptions, onCreated }: CollectionFormProps) {
  const { user } = useAuth();

  const [dealerId,       setDealerId]       = useState("");
  const [paymentMode,    setPaymentMode]    = useState<PaymentMode | "">("");
  const [amount,         setAmount]         = useState("");
  const [collectionDate, setCollectionDate] = useState(TODAY);
  const [notes,          setNotes]          = useState("");
  const [formError,      setFormError]      = useState("");

  const [whatsappMessage, setWhatsappMessage] = useState<string | null>(null);

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () =>
      collectionsService.create({
        dealerId,
        paymentMode: paymentMode as PaymentMode,
        amount: parseFloat(amount),
        collectionDate,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      onCreated();
      const dealerName = dealerOptions.find((d) => d.value === dealerId)?.label ?? "";
      const message = buildCollectionWhatsAppMessage({
        dealerName,
        amount: parseFloat(amount),
        paymentMode,
        collectionDate,
        staffName: user?.name,
        notes: notes.trim() || undefined,
      });
      setWhatsappMessage(message);
      setDealerId(""); setPaymentMode(""); setAmount(""); setCollectionDate(TODAY); setNotes(""); setFormError("");
    },
    onError: (err: unknown) => setFormError(getApiErrorMessage(err, "Failed to record")),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!dealerId)    return setFormError("Please select a dealer.");
    if (!paymentMode) return setFormError("Please select a payment mode.");
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return setFormError("Please enter a valid amount.");
    if (!collectionDate) return setFormError("Please select a date.");
    submit();
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card px-4 py-4 sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">New Collection</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <div className="flex flex-col gap-1.5 lg:col-span-1 xl:col-span-1">
            <Label className="text-xs font-medium text-muted-foreground">Dealer</Label>
            <Combobox items={dealerOptions} value={dealerId} onValueChange={setDealerId} placeholder="Select dealer…" searchPlaceholder="Search dealers…" className="h-9" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Mode of Payment</Label>
            <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as PaymentMode)}>
              <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Select mode…" /></SelectTrigger>
              <SelectContent>
                {PAYMENT_MODE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Amount (₹)</Label>
            <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Date</Label>
            <DatePicker value={collectionDate} onChange={setCollectionDate} placeholder="Select date" className="h-9 w-full" />
          </div>
          <div className="flex flex-col gap-1.5 xl:col-span-1">
            <Label className="text-xs font-medium text-muted-foreground invisible">&nbsp;</Label>
            <Button type="submit" disabled={isPending} className="h-9 w-full sm:w-auto">
              {isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
              {isPending ? "Saving…" : "Add Collection"}
            </Button>
          </div>
        </div>

        <div className="mt-3">
          <Label className="text-xs font-medium text-muted-foreground">Notes (optional)</Label>
          <Input placeholder="e.g. Cheque no. 1234" value={notes} onChange={(e) => setNotes(e.target.value)} className="h-9 mt-1.5" />
        </div>
        {formError && <p className="mt-2 text-xs text-destructive">{formError}</p>}
      </form>

      {/* WhatsApp share dialog (after successful create) */}
      <Dialog open={!!whatsappMessage} onOpenChange={(open) => { if (!open) setWhatsappMessage(null); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg flex flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 px-6 pt-5 pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-full bg-[var(--accent)]">
                <CheckCircle2Icon className="size-3.5 text-[var(--accent-foreground)]" />
              </div>
              <DialogTitle className="text-base">Collection Recorded!</DialogTitle>
            </div>
          </DialogHeader>
          {whatsappMessage && (
            <div className="px-6 py-5">
              <WhatsAppSharePanel
                message={whatsappMessage}
                title="Share on WhatsApp"
                subtitle="Copy the message or tap Open WhatsApp to share with your group."
                doneLabel="Done"
                onDone={() => setWhatsappMessage(null)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
