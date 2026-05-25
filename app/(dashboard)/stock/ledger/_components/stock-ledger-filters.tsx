"use client";

import { XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import type { CropRow } from "@/types/database.types";
import type { SeedProductWithCropRow } from "@/lib/database/seeds.queries";

export interface LedgerFilters {
  cropId: string;
  variety: string;
  packSize: string;
  batchNumber: string;
}

interface Props {
  filters: LedgerFilters;
  crops: CropRow[];
  seedProducts: SeedProductWithCropRow[];
  onChange: (next: LedgerFilters) => void;
}

export function StockLedgerFilters({ filters, crops, seedProducts, onChange }: Props) {
  const hasAnyFilter = !!(filters.cropId || filters.variety || filters.packSize || filters.batchNumber);

  // Derived options based on current crop/variety selection
  const varietyOptions = Array.from(
    new Set(
      seedProducts
        .filter((p) => !filters.cropId || p.crop_id === filters.cropId)
        .map((p) => p.variety)
    )
  ).sort();

  const packSizeOptions = Array.from(
    new Set(
      seedProducts
        .filter((p) => !filters.cropId || p.crop_id === filters.cropId)
        .filter((p) => !filters.variety || p.variety === filters.variety)
        .map((p) => p.pack_size)
    )
  ).sort();

  const selectedCrop = crops.find((c) => c.id === filters.cropId);

  function handleCropChange(value: string | null) {
    onChange({ cropId: !value || value === "all" ? "" : value, variety: "", packSize: "", batchNumber: "" });
  }

  function handleVarietyChange(value: string | null) {
    onChange({ ...filters, variety: !value || value === "all" ? "" : value, packSize: "", batchNumber: "" });
  }

  function handlePackSizeChange(value: string | null) {
    onChange({ ...filters, packSize: !value || value === "all" ? "" : value, batchNumber: "" });
  }

  function handleBatchNumberChange(value: string) {
    onChange({ cropId: "", variety: "", packSize: "", batchNumber: value });
  }

  function handleClear() {
    onChange({ cropId: "", variety: "", packSize: "", batchNumber: "" });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={filters.cropId || "all"} onValueChange={handleCropChange}>
        <SelectTrigger className="h-9 w-full sm:w-40">
          <span className="flex-1 text-left text-sm truncate">
            {selectedCrop ? selectedCrop.name : <span className="text-muted-foreground">All Crops</span>}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Crops</SelectItem>
          {crops.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.variety || "all"}
        onValueChange={handleVarietyChange}
        disabled={!filters.cropId}
      >
        <SelectTrigger className="h-9 w-full sm:w-40">
          <span className="flex-1 text-left text-sm truncate">
            {filters.variety || <span className="text-muted-foreground">All Varieties</span>}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Varieties</SelectItem>
          {varietyOptions.map((v) => (
            <SelectItem key={v} value={v}>{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.packSize || "all"}
        onValueChange={handlePackSizeChange}
        disabled={!filters.variety}
      >
        <SelectTrigger className="h-9 w-full sm:w-40">
          <span className="flex-1 text-left text-sm truncate">
            {filters.packSize || <span className="text-muted-foreground">All Pack Sizes</span>}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Pack Sizes</SelectItem>
          {packSizeOptions.map((ps) => (
            <SelectItem key={ps} value={ps}>{ps}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        placeholder="Search batch #…"
        value={filters.batchNumber}
        onChange={(e) => handleBatchNumberChange(e.target.value)}
        className="h-9 w-full sm:w-48"
      />

      {hasAnyFilter && (
        <Button variant="ghost" size="sm" className="h-9 px-2 text-muted-foreground" onClick={handleClear}>
          <XIcon className="size-3.5 mr-1" />Clear
        </Button>
      )}
    </div>
  );
}
