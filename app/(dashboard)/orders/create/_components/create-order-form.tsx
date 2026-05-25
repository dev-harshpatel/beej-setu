"use client";

import { useEffect, useRef, useState } from "react";
import {
  MapPinIcon,
  TruckIcon,
  SproutIcon,
  SearchIcon,
  PlusIcon,
  MinusIcon,
  XIcon,
  ChevronDownIcon,
  CheckIcon,
  BuildingIcon,
  PhoneIcon,
  NavigationIcon,
  BadgeCheckIcon,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Combobox } from "@/components/ui/combobox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DealerRow } from "@/types/database.types";
import type { SeedProductWithCropRow } from "@/lib/database/seeds.queries";
import { DatePicker } from "@/components/ui/date-picker";
import { OrderConfirmModal, type ConfirmOrderItem } from "./order-confirm-modal";

type CropRowState = {
  id: string;
  cropId: string;
  variety: string;
  seedId: string;
  unit: "Bag" | "Packet" | "Box";
  quantity: number;
  seedName: string;
  cropName: string;
};

const ORDER_UNITS = ["Bag", "Packet", "Box"] as const;

let rowCounter = 0;
function newRow(): CropRowState {
  return {
    id: `row-${++rowCounter}`,
    cropId: "",
    variety: "",
    seedId: "",
    unit: "Bag",
    quantity: 1,
    seedName: "",
    cropName: "",
  };
}

export function CreateOrderForm() {
  // Remote data
  const [dealers, setDealers] = useState<DealerRow[]>([]);
  const [seeds, setSeeds] = useState<SeedProductWithCropRow[]>([]);

  // Section 1
  const [center, setCenter] = useState("");
  const [dealerId, setDealerId] = useState("");
  const [dealerSearch, setDealerSearch] = useState("");
  const [dealerOpen, setDealerOpen] = useState(false);

  // Section 2
  const [transportName, setTransportName] = useState("");
  const [deliveryCenter, setDeliveryCenter] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");

  // Section 3
  const [cropRows, setCropRows] = useState<CropRowState[]>([newRow()]);

  // Modal
  const [confirmOpen, setConfirmOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/dealers?pageSize=500&status=ACTIVE")
      .then((r) => r.json())
      .then((json) => setDealers(json.data?.data ?? []))
      .catch(() => setDealers([]));

    fetch("/api/seeds?pageSize=500&excludeZeroStock=true")
      .then((r) => r.json())
      .then((json) => setSeeds(json.data?.data ?? []))
      .catch(() => setSeeds([]));
  }, []);

  const selectedDealer = dealers.find((d) => d.id === dealerId) ?? null;

  const filteredDealers = dealerSearch
    ? dealers.filter((d) =>
        d.name.toLowerCase().includes(dealerSearch.toLowerCase()) ||
        (d.territory ?? "").toLowerCase().includes(dealerSearch.toLowerCase())
      )
    : dealers;

  function selectDealer(dealer: DealerRow) {
    setDealerId(dealer.id);
    setDealerOpen(false);
    setDealerSearch("");
    if (!center && dealer.territory) setCenter(dealer.territory);
    if (!transportName && dealer.default_transport) setTransportName(dealer.default_transport);
    if (!deliveryCenter && (dealer.delivery_instruction ?? dealer.default_delivery_instruction)) {
      setDeliveryCenter((dealer.delivery_instruction ?? dealer.default_delivery_instruction) ?? "");
    }
  }

  // Derived data
  const cropItems = Array.from(
    new Map(seeds.map((s) => [s.crop_id, s.crop.name])).entries()
  ).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));

  function getVarietiesForCrop(cropId: string) {
    return [...new Set(seeds.filter((s) => s.crop_id === cropId).map((s) => s.variety))].sort();
  }

  function getPackSizesForVariety(cropId: string, variety: string) {
    return seeds.filter((s) => s.crop_id === cropId && s.variety === variety);
  }

  function updateCropRow(rowId: string, patch: Partial<CropRowState>) {
    setCropRows((rows) =>
      rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r))
    );
  }

  function handleCropChange(rowId: string, cropId: string) {
    updateCropRow(rowId, {
      cropId,
      cropName: cropItems.find((c) => c.id === cropId)?.name ?? "",
      variety: "",
      seedId: "",
      seedName: "",
    });
  }

  function handleVarietyChange(rowId: string, variety: string) {
    updateCropRow(rowId, { variety, seedId: "", seedName: "" });
  }

  function handlePackSizeChange(rowId: string, seedId: string) {
    const seed = seeds.find((s) => s.id === seedId);
    if (!seed) return;
    updateCropRow(rowId, {
      seedId: seed.id,
      seedName: `${seed.variety} — ${seed.pack_size}`,
    });
  }

  function handleQuantityChange(rowId: string, delta: number) {
    setCropRows((rows) =>
      rows.map((r) =>
        r.id === rowId ? { ...r, quantity: Math.max(1, r.quantity + delta) } : r
      )
    );
  }

  function handleQuantityInput(rowId: string, value: string) {
    const n = parseInt(value, 10);
    if (!isNaN(n) && n >= 1) updateCropRow(rowId, { quantity: n });
  }

  function addCropRow() {
    setCropRows((rows) => [...rows, newRow()]);
  }

  function removeCropRow(rowId: string) {
    setCropRows((rows) => rows.filter((r) => r.id !== rowId));
  }

  // Progress
  const step1Done = !!dealerId;
  const step2Done = !!(transportName || deliveryCenter);
  const step3Done = cropRows.some((r) => !!r.seedId);

  const canProceed =
    step1Done && cropRows.length > 0 && cropRows.every((r) => r.seedId && r.quantity >= 1);

  const confirmItems: ConfirmOrderItem[] = cropRows
    .filter((r) => r.seedId)
    .map((r) => ({
      id: r.id,
      seedId: r.seedId,
      cropName: r.cropName,
      seedName: r.seedName,
      unit: r.unit,
      quantity: r.quantity,
    }));

  return (
    <>
      {/* Sticky progress header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 sm:px-6 py-3">
        <div className="flex items-center gap-0">
          {[
            { num: 1, label: "Location & Dealer", done: step1Done },
            { num: 2, label: "Delivery Details", done: step2Done },
            { num: 3, label: "Crop Details", done: step3Done },
          ].map((step, i, arr) => (
            <div key={step.num} className="flex items-center gap-0">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs font-semibold shrink-0 transition-colors",
                    step.done
                      ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {step.done ? <CheckIcon className="size-3.5" /> : step.num}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium hidden sm:block",
                    step.done ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < arr.length - 1 && (
                <div className="mx-2 sm:mx-3 h-px w-8 sm:w-12 bg-border shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-5 p-4 sm:p-6">
        {/* ── Section 1: Location & Dealer ── */}
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--accent)]">
              <MapPinIcon className="size-3.5 text-[var(--accent-foreground)]" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">Location &amp; Dealer</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Center */}
            <div className="flex flex-col gap-1.5 lg:col-span-2">
              <Label htmlFor="center">Center</Label>
              <Input
                id="center"
                placeholder="e.g. Ahmedabad Central"
                value={center}
                onChange={(e) => setCenter(e.target.value)}
              />
            </div>

            {/* Dealer searchable dropdown */}
            <div className="flex flex-col gap-1.5 lg:col-span-2">
              <Label>Dealer <span className="text-destructive">*</span></Label>
              <Popover
                open={dealerOpen}
                onOpenChange={(o) => {
                  setDealerOpen(o);
                  if (o) setTimeout(() => searchRef.current?.focus(), 50);
                }}
              >
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-between font-normal h-8",
                        !dealerId && "text-muted-foreground"
                      )}
                    />
                  }
                >
                  <span className="truncate">
                    {selectedDealer ? selectedDealer.name : "Search dealer…"}
                  </span>
                  <ChevronDownIcon className="size-4 text-muted-foreground shrink-0" />
                </PopoverTrigger>
                <PopoverContent
                  className="p-0 w-72"
                  align="start"
                  sideOffset={4}
                >
                  <div className="p-2 border-b border-border">
                    <div className="relative">
                      <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        ref={searchRef}
                        placeholder="Search dealers…"
                        value={dealerSearch}
                        onChange={(e) => setDealerSearch(e.target.value)}
                        className="pl-8 h-7 text-xs border-none shadow-none focus-visible:ring-0"
                      />
                    </div>
                  </div>
                  <div className="max-h-52 overflow-y-auto py-1">
                    {filteredDealers.length === 0 ? (
                      <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                        No dealers found
                      </p>
                    ) : (
                      filteredDealers.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => selectDealer(d)}
                          className={cn(
                            "flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-accent hover:text-accent-foreground",
                            d.id === dealerId && "bg-accent text-accent-foreground"
                          )}
                        >
                          {d.id === dealerId && <CheckIcon className="size-3.5 shrink-0" />}
                          <span className={cn("truncate", d.id !== dealerId && "pl-[19px]")}>
                            {d.name}
                            {d.territory && (
                              <span className="text-xs text-muted-foreground ml-1">· {d.territory}</span>
                            )}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Auto-fill dealer info card */}
          {selectedDealer && (
            <div className="rounded-lg border border-[var(--accent)] bg-[var(--accent)]/20 px-4 py-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[var(--accent-foreground)]">
                  {selectedDealer.name}
                </p>
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-[var(--accent-foreground)]/30 text-[var(--accent-foreground)] bg-transparent gap-1">
                  <BadgeCheckIcon className="size-3" />
                  Auto-filled
                </Badge>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {selectedDealer.contact && (
                  <div className="flex items-center gap-1.5">
                    <PhoneIcon className="size-3 shrink-0" />
                    {selectedDealer.contact}
                  </div>
                )}
                {selectedDealer.territory && (
                  <div className="flex items-center gap-1.5">
                    <NavigationIcon className="size-3 shrink-0" />
                    {selectedDealer.territory}
                  </div>
                )}
                {selectedDealer.default_transport && (
                  <div className="flex items-center gap-1.5">
                    <TruckIcon className="size-3 shrink-0" />
                    {selectedDealer.default_transport}
                  </div>
                )}
                {selectedDealer.delivery_instruction && (
                  <div className="flex items-center gap-1.5">
                    <BuildingIcon className="size-3 shrink-0" />
                    {selectedDealer.delivery_instruction}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ── Section 2: Delivery Details ── */}
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--accent)]">
              <TruckIcon className="size-3.5 text-[var(--accent-foreground)]" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">Delivery Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="transportName">Transport Name</Label>
              <Input
                id="transportName"
                placeholder="e.g. Rajesh Transport"
                value={transportName}
                onChange={(e) => setTransportName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deliveryCenter">Delivery Center</Label>
              <Input
                id="deliveryCenter"
                placeholder="e.g. Surat Godown"
                value={deliveryCenter}
                onChange={(e) => setDeliveryCenter(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Expected Delivery Date</Label>
              <DatePicker
                value={deliveryDate}
                onChange={setDeliveryDate}
                placeholder="Pick a date"
                minDate={new Date().toISOString().slice(0, 10)}
                className="w-full h-8"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-4">
              <Label htmlFor="notes">Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <textarea
                id="notes"
                rows={2}
                placeholder="Any special instructions…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors"
              />
            </div>
          </div>
        </section>

        {/* ── Section 3: Crop Details ── */}
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--accent)]">
              <SproutIcon className="size-3.5 text-[var(--accent-foreground)]" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">Crop Details</h2>
          </div>

          <div className="flex flex-col gap-3">
            {cropRows.map((row, idx) => (
              <div
                key={row.id}
                className="relative rounded-lg border border-border bg-background p-3 sm:p-4 flex flex-col gap-3"
              >
                {/* Remove button */}
                {cropRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCropRow(row.id)}
                    className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    aria-label="Remove crop"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                )}

                {/* Row 1: Crop + Variety */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-6 sm:pr-0">
                  <div className="flex flex-col gap-1.5">
                    <Label>Crop <span className="text-destructive">*</span></Label>
                    <Combobox
                      items={cropItems.map((c) => ({ value: c.id, label: c.name }))}
                      value={row.cropId}
                      onValueChange={(v) => handleCropChange(row.id, v)}
                      placeholder="Select crop"
                      searchPlaceholder="Search crops…"
                      emptyText="No crops found"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label>Variety <span className="text-destructive">*</span></Label>
                    <Combobox
                      items={getVarietiesForCrop(row.cropId).map((v) => ({ value: v, label: v }))}
                      value={row.variety}
                      onValueChange={(v) => handleVarietyChange(row.id, v)}
                      placeholder={row.cropId ? "Select variety" : "Select crop first"}
                      searchPlaceholder="Search varieties…"
                      emptyText="No varieties found"
                      disabled={!row.cropId}
                    />
                  </div>
                </div>

                {/* Row 2: Pack Size + Unit + Quantity */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Pack Size <span className="text-destructive">*</span></Label>
                    <Combobox
                      items={getPackSizesForVariety(row.cropId, row.variety).map((s) => ({
                        value: s.id,
                        label: s.pack_size,
                      }))}
                      value={row.seedId}
                      onValueChange={(v) => handlePackSizeChange(row.id, v)}
                      placeholder={row.variety ? "Select pack size" : "Select variety first"}
                      searchPlaceholder="Search…"
                      emptyText="No pack sizes found"
                      disabled={!row.variety}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label>Unit</Label>
                    <div className="flex h-8 rounded-lg border border-input overflow-hidden">
                      {ORDER_UNITS.map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => updateCropRow(row.id, { unit: u })}
                          className={cn(
                            "flex-1 text-xs font-medium transition-colors",
                            row.unit === u
                              ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                              : "text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label>Quantity <span className="text-destructive">*</span></Label>
                    <div className="flex h-8 items-center rounded-lg border border-input overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(row.id, -1)}
                        className="flex size-8 shrink-0 items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                        aria-label="Decrease"
                      >
                        <MinusIcon className="size-3.5" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={row.quantity}
                        onChange={(e) => handleQuantityInput(row.id, e.target.value)}
                        className="flex-1 h-full text-center text-sm font-medium tabular-nums bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(row.id, 1)}
                        className="flex size-8 shrink-0 items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                        aria-label="Increase"
                      >
                        <PlusIcon className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addCropRow}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "w-full gap-1.5 border-dashed border-[var(--accent)] text-[var(--accent-foreground)] bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20"
              )}
            >
              <PlusIcon className="size-3.5" />
              Add Another Crop
            </button>
          </div>
        </section>

        {/* Proceed button */}
        <Button
          className="w-full bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent)]/80 font-semibold"
          size="default"
          disabled={!canProceed}
          onClick={() => setConfirmOpen(true)}
        >
          Proceed to Confirm →
        </Button>

        {!canProceed && (
          <p className="text-center text-xs text-muted-foreground -mt-2">
            {!dealerId
              ? "Select a dealer to continue"
              : "Select at least one crop with a variety and quantity"}
          </p>
        )}
      </div>

      <OrderConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        dealer={selectedDealer}
        center={center}
        transportName={transportName}
        deliveryCenter={deliveryCenter}
        items={confirmItems}
        notes={notes}
        deliveryDate={deliveryDate}
      />
    </>
  );
}
