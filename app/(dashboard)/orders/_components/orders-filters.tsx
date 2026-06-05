"use client";

import { useState } from "react";
import { SearchIcon, XIcon, SlidersHorizontalIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import type { FilterItem } from "../_lib/use-orders-filter-data";

interface FilterControls {
  search: string;
  onSearchChange: (v: string) => void;
  dealerId: string;
  onDealerChange: (v: string) => void;
  staffId: string;
  onStaffChange: (v: string) => void;
  dateFrom: string;
  onDateFromChange: (v: string) => void;
  dateTo: string;
  onDateToChange: (v: string) => void;
  onReset: () => void;
  dealerItems: FilterItem[];
  staffItems: FilterItem[];
  canViewDealers: boolean;
  canViewUsers: boolean;
}

// ── Desktop inline filter bar (rendered in the header row) ────
export function OrdersDesktopFiltersBar({
  search,
  onSearchChange,
  dealerId,
  onDealerChange,
  staffId,
  onStaffChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onReset,
  dealerItems,
  staffItems,
  canViewDealers,
  canViewUsers,
}: FilterControls) {
  const hasActiveFilters = dealerId || staffId || dateFrom || dateTo || search;

  return (
    <div className="hidden sm:flex items-center gap-2 flex-1 min-w-0 justify-end">
      {/* Search */}
      <div className="relative min-w-0 w-52">
        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search orders…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {/* Dealer */}
      {canViewDealers && (
        <Combobox
          items={dealerItems}
          value={dealerId}
          onValueChange={onDealerChange}
          placeholder="All dealers"
          searchPlaceholder="Search dealers…"
          className="w-36"
          popoverClassName="min-w-64"
          wrap
        />
      )}

      {/* Staff */}
      {canViewUsers && (
        <Combobox
          items={staffItems}
          value={staffId}
          onValueChange={onStaffChange}
          placeholder="All staff"
          searchPlaceholder="Search staff…"
          className="w-32"
        />
      )}

      {/* Date range */}
      <div className="flex items-center gap-1">
        <DatePicker
          value={dateFrom}
          onChange={onDateFromChange}
          placeholder="From"
          size="sm"
          className="w-28"
        />
        <span className="text-xs text-muted-foreground shrink-0">–</span>
        <DatePicker
          value={dateTo}
          onChange={onDateToChange}
          placeholder="To"
          size="sm"
          minDate={dateFrom || undefined}
          className="w-28"
        />
      </div>

      {/* Reset */}
      {hasActiveFilters && (
        <Button
          variant="ghost" size="sm"
          onClick={onReset}
          className="h-8 text-xs text-muted-foreground px-2 shrink-0"
        >
          <XIcon className="size-3.5" />
          Reset
        </Button>
      )}
    </div>
  );
}

// ── Mobile-only filter section (search bar + collapsible panel) ──
export function OrdersMobileFilters({
  search,
  onSearchChange,
  dealerId,
  onDealerChange,
  staffId,
  onStaffChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onReset,
  dealerItems,
  staffItems,
  canViewDealers,
  canViewUsers,
}: FilterControls) {
  const [open, setOpen] = useState(false);
  const hasActiveFilters  = dealerId || staffId || dateFrom || dateTo || search;
  const activeExtraCount  = [dealerId, staffId, dateFrom, dateTo].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-2 sm:hidden">
      {/* Search row */}
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search orders…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        <Button
          variant={open ? "default" : "outline"}
          size="sm"
          className="h-9 shrink-0 relative"
          onClick={() => setOpen((o) => !o)}
        >
          <SlidersHorizontalIcon className="size-4" />
          {activeExtraCount > 0 && (
            <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px] leading-none flex items-center justify-center bg-primary text-primary-foreground border-0">
              {activeExtraCount}
            </Badge>
          )}
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost" size="sm"
            onClick={onReset}
            className="h-9 shrink-0 text-xs text-muted-foreground px-2"
          >
            <XIcon className="size-3.5" />
          </Button>
        )}
      </div>

      {/* Expanded filters */}
      {open && (
        <div className="flex flex-col gap-2">
          {(canViewDealers || canViewUsers) && (
            <div className="grid grid-cols-2 gap-2">
              {canViewDealers && (
                <Combobox
                  items={dealerItems}
                  value={dealerId}
                  onValueChange={onDealerChange}
                  placeholder="All dealers"
                  searchPlaceholder="Search dealers…"
                  className="w-full"
                  popoverClassName="min-w-64"
                  wrap
                />
              )}
              {canViewUsers && (
                <Combobox
                  items={staffItems}
                  value={staffId}
                  onValueChange={onStaffChange}
                  placeholder="All staff"
                  searchPlaceholder="Search staff…"
                  className="w-full"
                />
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <DatePicker
              value={dateFrom}
              onChange={onDateFromChange}
              placeholder="From date"
              size="sm"
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground shrink-0">–</span>
            <DatePicker
              value={dateTo}
              onChange={onDateToChange}
              placeholder="To date"
              size="sm"
              minDate={dateFrom || undefined}
              className="flex-1"
            />
          </div>
        </div>
      )}
    </div>
  );
}
