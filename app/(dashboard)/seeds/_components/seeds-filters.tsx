"use client";

import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
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
  function set(key: keyof SeedFilters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  const selectedCrop    = crops.find((c) => c.id === filters.cropId);
  const cropSelected    = !!filters.cropId;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          placeholder="Search by variety or pack size…"
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      <Select
        value={filters.cropId || "all"}
        onValueChange={(v) => onChange({ ...filters, cropId: v === "all" ? "" : (v ?? ""), variety: "" })}
      >
        <SelectTrigger className="h-9 w-full sm:w-48">
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
        onValueChange={(v) => set("variety", v === "all" ? "" : (v ?? ""))}
        disabled={!cropSelected}
      >
        <SelectTrigger className="h-9 w-full sm:w-48" disabled={!cropSelected}>
          <span className="flex-1 text-left text-sm truncate">
            {filters.variety
              ? filters.variety
              : <span className="text-muted-foreground">{cropSelected ? "All Varieties" : "Select crop first"}</span>}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Varieties</SelectItem>
          {varieties.map((v) => (
            <SelectItem key={v} value={v}>{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
