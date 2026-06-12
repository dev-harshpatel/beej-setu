"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { formatNumber } from "@/lib/utils";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { CollectionForm } from "./collection-form";
import { CollectionsTable } from "./collections-table";
import { CollectionsEditDialog, type CollectionUpdateValues } from "./dialogs/collections-edit-dialog";
import { useCollectionsData } from "../_lib/use-collections-data";
import { collectionsService } from "@/services/collections.service";
import { getApiErrorMessage } from "@/lib/api-client";
import type { CollectionWithRelations } from "@/lib/database/collections.queries";

export function CollectionsPage() {
  const { user } = useAuth();

  const [editTarget,   setEditTarget]   = useState<CollectionWithRelations | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CollectionWithRelations | null>(null);

  const { dealerOptions, collections, loading, invalidate } = useCollectionsData(user?.id);

  async function handleEdit(id: string, payload: CollectionUpdateValues) {
    try {
      await collectionsService.update(id, payload);
    } catch (err: unknown) {
      throw new Error(getApiErrorMessage(err, "Failed to update"));
    }
    invalidate();
  }

  const totalAmount = collections.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-semibold text-foreground">Collections</h2>
        <p className="text-xs text-muted-foreground">
          {collections.length > 0
            ? `${collections.length} entr${collections.length === 1 ? "y" : "ies"} · ₹${formatNumber(totalAmount)}`
            : "Record payments received from dealers"}
        </p>
      </div>

      {/* New collection form (owns its WhatsApp share dialog) */}
      <CollectionForm dealerOptions={dealerOptions} onCreated={invalidate} />

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
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Collection"
        description={
          deleteTarget ? (
            <>
              Delete the{" "}
              <span className="font-medium text-foreground">₹{formatNumber(deleteTarget.amount)}</span>{" "}
              collection from{" "}
              <span className="font-medium text-foreground">{deleteTarget.dealer?.name ?? "—"}</span>{" "}
              on{" "}
              <span className="font-medium text-foreground">
                {format(new Date(deleteTarget.collection_date), "dd MMM yyyy")}
              </span>
              ? This cannot be undone.
            </>
          ) : null
        }
        onConfirm={async () => {
          try {
            await collectionsService.remove(deleteTarget!.id);
          } catch (err: unknown) {
            throw new Error(getApiErrorMessage(err, "Failed to delete"));
          }
          invalidate();
        }}
      />
    </div>
  );
}
