"use client";

import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import type { CropRow } from "@/types/database.types";

export interface StockFilters {
  search: string;
  cropId: string;
}

interface StockFiltersProps {
  filters: StockFilters;
  crops: CropRow[];
  onChange: (f: StockFilters) => void;
}

export function StockFilters({ filters, crops, onChange }: StockFiltersProps) {
  const selectedCrop = crops.find((c) => c.id === filters.cropId);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          placeholder="Search by variety…"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="pl-9 h-9"
        />
      </div>
      <Select
        value={filters.cropId || "all"}
        onValueChange={(v) => onChange({ ...filters, cropId: v === "all" ? "" : (v ?? "") })}
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
    </div>
  );
}
