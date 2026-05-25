"use client";

import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface DealerFilters {
  search: string;
  status: string;
  territory: string;
}

interface DealersFiltersProps {
  searchInput: string;
  onSearchChange: (v: string) => void;
  filters: DealerFilters;
  territories: string[];
  onChange: (filters: DealerFilters) => void;
}

export function DealersFilters({ searchInput, onSearchChange, filters, territories, onChange }: DealersFiltersProps) {
  function set(key: Exclude<keyof DealerFilters, "search">, value: string) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex flex-col gap-1 flex-1">
        <label className="text-xs font-medium text-muted-foreground">Search</label>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search dealers..."
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1 w-full sm:w-44">
        <label className="text-xs font-medium text-muted-foreground">Territory</label>
        <Select value={filters.territory || "all"} onValueChange={(v) => set("territory", v === "all" ? "" : (v ?? ""))}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="All Territories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Territories</SelectItem>
            {territories.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1 w-full sm:w-36">
        <label className="text-xs font-medium text-muted-foreground">Status</label>
        <Select value={filters.status || "all"} onValueChange={(v) => set("status", v === "all" ? "" : (v ?? ""))}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="TERMINATED">Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
