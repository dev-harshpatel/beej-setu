"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { toTitleCase } from "@/lib/utils/normalize";
import type { SeedProductWithCropRow } from "@/lib/database/seeds.queries";
import type { CropRow } from "@/types/database.types";

interface SeedFormDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  seed: SeedProductWithCropRow | null;
  crops: CropRow[];
  onSuccess: () => void;
}

export function SeedFormDialog({ open, onOpenChange, seed, crops, onSuccess }: SeedFormDialogProps) {
  const isEdit = !!seed;

  // cropId: UUID of an existing crop; newCropName: display name of a new crop (not yet saved)
  const [cropId,        setCropId]        = useState(seed?.crop_id ?? "");
  const [newCropName,   setNewCropName]   = useState("");
  const [variety,       setVariety]       = useState(seed?.variety ?? "");
  const [packSize,      setPackSize]      = useState(seed?.pack_size ?? "");
  const [packetsPerBag, setPacketsPerBag] = useState(String(seed?.packets_per_bag ?? ""));
  const [status,        setStatus]        = useState<"ACTIVE" | "INACTIVE">(seed?.status ?? "ACTIVE");
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");

  const cropItems = crops.map((c) => ({ value: c.id, label: c.name }));

  function handleCropSelect(id: string) {
    setCropId(id);
    setNewCropName("");
  }

  function handleCropCreate(raw: string) {
    setCropId("");
    setNewCropName(toTitleCase(raw));
  }

  async function handleSubmit() {
    setError("");
    if (!cropId && !newCropName) { setError("Select or type a crop name"); return; }
    if (!variety.trim())         { setError("Variety is required"); return; }
    if (!packSize.trim())        { setError("Pack size is required"); return; }
    const ppb = parseInt(packetsPerBag, 10);
    if (isNaN(ppb) || ppb < 1)  { setError("Packets per bag must be at least 1"); return; }

    setLoading(true);
    try {
      let resolvedCropId = cropId;

      // Create the crop first if it's a new one
      if (newCropName) {
        const cropRes  = await fetch("/api/crops", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ name: newCropName }),
        });
        const cropJson = await cropRes.json();
        if (!cropRes.ok || !cropJson.success) {
          setError(cropJson.message ?? "Failed to create crop");
          return;
        }
        resolvedCropId = cropJson.data.id;
      }

      const url    = isEdit ? `/api/seeds/${seed!.id}` : "/api/seeds";
      const method = isEdit ? "PATCH" : "POST";
      const body   = isEdit
        ? { cropId: resolvedCropId, variety: variety.trim(), packSize: packSize.trim(), packetsPerBag: ppb, status }
        : { cropId: resolvedCropId, variety: variety.trim(), packSize: packSize.trim(), packetsPerBag: ppb };

      const res  = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok || !json.success) { setError(json.message ?? "Failed to save"); return; }

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Crop <span className="text-destructive">*</span></Label>
            <CreatableCombobox
              items={cropItems}
              value={cropId}
              pendingLabel={newCropName ? `${newCropName} (new)` : undefined}
              onValueChange={handleCropSelect}
              onCreate={handleCropCreate}
              placeholder="Select or type a crop name"
              searchPlaceholder="Search or create crop…"
            />
            {newCropName && (
              <p className="text-xs text-muted-foreground">
                A new crop <span className="font-medium text-foreground">{newCropName}</span> will be created on save.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Variety <span className="text-destructive">*</span></Label>
            <Input
              placeholder="e.g. Hybrid 123"
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Pack Size <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. 250g"
                value={packSize}
                onChange={(e) => setPackSize(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Packets / Bag <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min={1}
                placeholder="e.g. 20"
                value={packetsPerBag}
                onChange={(e) => setPacketsPerBag(e.target.value)}
              />
            </div>
          </div>

          {isEdit && (
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <div className="flex gap-2">
                {(["ACTIVE", "INACTIVE"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`flex-1 rounded-lg border py-1.5 text-sm font-medium transition-colors ${
                      status === s
                        ? "border-transparent bg-[var(--accent)] text-[var(--accent-foreground)]"
                        : "border-input text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {s === "ACTIVE" ? "Active" : "Inactive"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={loading}
            className="bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent)]/80"
          >
            {loading ? "Saving…" : isEdit ? "Save Changes" : "Add Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
