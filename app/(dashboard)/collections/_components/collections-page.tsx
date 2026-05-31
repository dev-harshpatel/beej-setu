"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { CollectionsTable } from "./collections-table";
import { CollectionsEditDialog } from "./collections-edit-dialog";
import { CollectionsDeleteDialog } from "./collections-delete-dialog";
import type { CollectionWithRelations } from "@/lib/database/collections.queries";
import type { DealerRow } from "@/types/database.types";

type PaymentMode = "CASH" | "BANK_TRANSFER" | "UPI" | "CHEQUE";

const PAYMENT_MODE_OPTIONS: { value: PaymentMode; label: string }[] = [
  { value: "CASH",          label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "UPI",           label: "UPI" },
  { value: "CHEQUE",        label: "Cheque" },
];

const TODAY = format(new Date(), "yyyy-MM-dd");

export function CollectionsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // New collection form state
  const [dealerId,       setDealerId]      = useState("");
  const [paymentMode,    setPaymentMode]   = useState<PaymentMode | "">("");
  const [amount,         setAmount]        = useState("");
  const [collectionDate, setCollectionDate] = useState(TODAY);
  const [notes,          setNotes]         = useState("");
  const [formError,      setFormError]     = useState("");

  // Edit / delete target
  const [editTarget,   setEditTarget]   = useState<CollectionWithRelations | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CollectionWithRelations | null>(null);

  // ── Dealers ──────────────────────────────────────────────────────────────
  const { data: dealerData } = useQuery({
    queryKey: ["dealers-for-collection"],
    queryFn: async () => {
      const res  = await fetch("/api/dealers?pageSize=200");
      const json = await res.json();
      return (json.data?.data ?? []) as DealerRow[];
    },
    staleTime: 5 * 60_000,
  });
  const dealerOptions = (dealerData ?? []).map((d) => ({ value: d.id, label: d.name }));

  // ── Collections ───────────────────────────────────────────────────────────
  const { data: collections = [], isFetching } = useQuery({
    queryKey: ["collections", user?.id],
    queryFn: async () => {
      const res  = await fetch("/api/collections");
      const json = await res.json();
      return (json.data ?? []) as CollectionWithRelations[];
    },
    enabled: !!user?.id,
  });
  const loading = isFetching && collections.length === 0;

  // ── Create ────────────────────────────────────────────────────────────────
  const { mutate: submit, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealerId, paymentMode, amount: parseFloat(amount), collectionDate, notes: notes.trim() || undefined }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to record");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      setDealerId(""); setPaymentMode(""); setAmount(""); setCollectionDate(TODAY); setNotes(""); setFormError("");
    },
    onError: (err: Error) => setFormError(err.message),
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

  // ── Edit ──────────────────────────────────────────────────────────────────
  async function handleEdit(id: string, payload: { paymentMode: PaymentMode; amount: number; collectionDate: string; notes?: string | null }) {
    const res = await fetch(`/api/collections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentMode: payload.paymentMode, amount: payload.amount, collectionDate: payload.collectionDate, notes: payload.notes }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message ?? "Failed to update");
    queryClient.invalidateQueries({ queryKey: ["collections"] });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    const res = await fetch(`/api/collections/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) throw new Error(json.message ?? "Failed to delete");
    queryClient.invalidateQueries({ queryKey: ["collections"] });
  }

  const totalAmount = collections.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-semibold text-foreground">Collections</h2>
        <p className="text-xs text-muted-foreground">
          {collections.length > 0
            ? `${collections.length} entr${collections.length === 1 ? "y" : "ies"} · ₹${totalAmount.toLocaleString("en-IN")}`
            : "Record payments received from dealers"}
        </p>
      </div>

      {/* New collection form */}
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

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 sm:px-5 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Collection History</h3>
        </div>
        <div className="overflow-x-auto">
          <CollectionsTable
            collections={collections}
            loading={loading}
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
          />
        </div>
      </div>

      {/* Dialogs */}
      <CollectionsEditDialog
        collection={editTarget}
        open={!!editTarget}
        onOpenChange={(open) => { if (!open) setEditTarget(null); }}
        onSave={handleEdit}
      />
      <CollectionsDeleteDialog
        collection={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
