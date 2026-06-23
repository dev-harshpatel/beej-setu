"use client";

import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import type { CropRow } from "@/types/database.types";

export interface SeedFilters {
  search: string;
  cropId: string;
  variety: string;
}

interface SeedsFiltersProps {
  filters: SeedFilters;
  crops: CropRow[];
  varieties: string[];
  onChange: (filters: SeedFilters) => void;
}

export function SeedsFilters({ filters, crops, varieties, onChange }: SeedsFiltersProps) {
  const cropItems = [
    { value: "", label: "All Crops" },
    ...crops.map((c) => ({ value: c.id, label: c.name })),
  ];

  const varietyItems = [
    { value: "", label: "All Varieties" },
    ...varieties.map((v) => ({ value: v, label: v })),
  ];

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {/* Search — desktop only (mobile search lives in the header row) */}
      <div className="relative flex-1 hidden sm:block">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          placeholder="Search by variety or pack size…"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="pl-9 h-9"
        />
      </div>

      {/* Crop + Variety: side-by-side on mobile, inline on desktop */}
      <div className="grid grid-cols-2 gap-2 sm:contents">
        <Combobox
          items={cropItems}
          value={filters.cropId}
          onValueChange={(v) => onChange({ ...filters, cropId: v, variety: "" })}
          placeholder="All Crops"
          searchPlaceholder="Search crops…"
          className="h-9 w-full sm:w-48"
          popoverClassName="min-w-48"
          wrap
        />

        <Combobox
          items={varietyItems}
          value={filters.variety}
          onValueChange={(v) => onChange({ ...filters, variety: v })}
          placeholder={filters.cropId ? "All Varieties" : "Select crop first"}
          searchPlaceholder="Search varieties…"
          disabled={!filters.cropId}
          className="h-9 w-full sm:w-48"
          popoverClassName="min-w-48"
        />
      </div>
    </div>
  );
}
