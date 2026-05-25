"use client";

import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import type { ProfileRow } from "@/types/database.types";

export interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  territory: string;
  staffId: string;
}

interface ReportsFiltersProps {
  filters: ReportFilters;
  territories: string[];
  staffList: Pick<ProfileRow, "id" | "name" | "territory">[];
  onChange: (filters: ReportFilters) => void;
}

export function ReportsFilters({ filters, territories, staffList, onChange }: ReportsFiltersProps) {
  function set<K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  function handleSelect(key: "territory" | "staffId", value: string | null) {
    set(key, !value || value === "all" ? "" : value);
  }

  const hasFilters = !!(filters.dateFrom || filters.dateTo || filters.territory || filters.staffId);

  function reset() {
    onChange({ dateFrom: "", dateTo: "", territory: "", staffId: "" });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:px-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filters</p>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={reset}
          >
            <XIcon className="size-3" />
            Reset
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        {/* Date From */}
        <div className="flex flex-col gap-1 w-full sm:w-44">
          <label className="text-xs font-medium text-muted-foreground">From Date</label>
          <DatePicker
            value={filters.dateFrom}
            onChange={(v) => {
              // If dateTo is earlier than new dateFrom, clear dateTo
              const next = { ...filters, dateFrom: v };
              if (filters.dateTo && v && v > filters.dateTo) next.dateTo = "";
              onChange(next);
            }}
            placeholder="Start date"
            className="h-9 w-full"
          />
        </div>

        {/* Date To */}
        <div className="flex flex-col gap-1 w-full sm:w-44">
          <label className="text-xs font-medium text-muted-foreground">To Date</label>
          <DatePicker
            value={filters.dateTo}
            onChange={(v) => set("dateTo", v)}
            placeholder="End date"
            minDate={filters.dateFrom || undefined}
            className="h-9 w-full"
          />
        </div>

        {/* Territory */}
        <div className="flex flex-col gap-1 w-full sm:w-48">
          <label className="text-xs font-medium text-muted-foreground">Territory</label>
          <Select
            value={filters.territory || "all"}
            onValueChange={(v) => handleSelect("territory", v)}
          >
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

        {/* Staff */}
        <div className="flex flex-col gap-1 w-full sm:w-52">
          <label className="text-xs font-medium text-muted-foreground">Staff Member</label>
          <Select
            value={filters.staffId || "all"}
            onValueChange={(v) => handleSelect("staffId", v)}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="All Staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {staffList.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                  {s.territory ? ` — ${s.territory}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
