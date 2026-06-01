"use client";

import { useEffect, useState } from "react";
import { SearchIcon, XIcon, SlidersHorizontalIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import type { DealerRow, ProfileRow } from "@/types/database.types";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/constants/roles.constants";

interface OrdersFiltersProps {
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
}

export function OrdersFilters({
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
}: OrdersFiltersProps) {
  const { hasPermission } = usePermissions();
  const canViewDealers = hasPermission(PERMISSIONS.DEALERS_VIEW);
  const canViewUsers = hasPermission(PERMISSIONS.USERS_VIEW);

  const [dealers, setDealers] = useState<DealerRow[]>([]);
  const [staffList, setStaffList] = useState<ProfileRow[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    if (canViewDealers) {
      fetch("/api/dealers?pageSize=100")
        .then((r) => r.json())
        .then((json) => setDealers(json.data?.data ?? []))
        .catch(() => setDealers([]));
    }

    if (canViewUsers) {
      Promise.all([
        fetch("/api/users?role=STAFF&pageSize=100").then((r) => r.json()),
        fetch("/api/users?role=ADMIN&pageSize=100").then((r) => r.json()),
      ])
        .then(([staff, admins]) => {
          const all: ProfileRow[] = [
            ...(staff.data?.data ?? []),
            ...(admins.data?.data ?? []),
          ];
          setStaffList(all);
        })
        .catch(() => setStaffList([]));
    }
  }, [canViewDealers, canViewUsers]);

  const hasActiveFilters = dealerId || staffId || dateFrom || dateTo || search;
  const activeExtraCount = [dealerId, staffId, dateFrom, dateTo].filter(Boolean).length;

  const dealerItems = [
    { value: "", label: "All dealers" },
    ...dealers.map((d) => ({ value: d.id, label: d.name })),
  ];

  const staffItems = [
    { value: "", label: "All staff" },
    ...staffList.map((s) => ({ value: s.id, label: s.name })),
  ];

  const dealerCombobox = canViewDealers && (
    <Combobox
      items={dealerItems}
      value={dealerId}
      onValueChange={onDealerChange}
      placeholder="All dealers"
      searchPlaceholder="Search dealers…"
      className="w-full sm:w-40"
      popoverClassName="min-w-64"
      wrap
    />
  );

  const staffCombobox = canViewUsers && (
    <Combobox
      items={staffItems}
      value={staffId}
      onValueChange={onStaffChange}
      placeholder="All staff"
      searchPlaceholder="Search staff…"
      className="w-full sm:w-40"
    />
  );

  const dateRange = (
    <div className="flex items-center gap-1.5 w-full sm:w-auto">
      <DatePicker
        value={dateFrom}
        onChange={onDateFromChange}
        placeholder="From date"
        size="sm"
        className="flex-1 sm:flex-none sm:w-36"
      />
      <span className="text-xs text-muted-foreground shrink-0">–</span>
      <DatePicker
        value={dateTo}
        onChange={onDateToChange}
        placeholder="To date"
        size="sm"
        minDate={dateFrom || undefined}
        className="flex-1 sm:flex-none sm:w-36"
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      {/* ── Mobile layout ── */}
      <div className="flex gap-2 sm:hidden">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search orders…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        {/* Filters toggle */}
        <Button
          variant={mobileFiltersOpen ? "default" : "outline"}
          size="sm"
          className="h-9 shrink-0 relative"
          onClick={() => setMobileFiltersOpen((o) => !o)}
        >
          <SlidersHorizontalIcon className="size-4" />
          {activeExtraCount > 0 && (
            <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px] leading-none flex items-center justify-center bg-primary text-primary-foreground border-0">
              {activeExtraCount}
            </Badge>
          )}
        </Button>

        {/* Reset (mobile) */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-9 shrink-0 text-xs text-muted-foreground px-2"
          >
            <XIcon className="size-3.5" />
          </Button>
        )}
      </div>

      {/* Expanded filters on mobile */}
      {mobileFiltersOpen && (
        <div className="flex flex-col gap-2 sm:hidden">
          {/* Dealer + Staff side by side */}
          {(canViewDealers || canViewUsers) && (
            <div className="grid grid-cols-2 gap-2">
              {dealerCombobox}
              {staffCombobox}
            </div>
          )}
          {dateRange}
        </div>
      )}

      {/* ── Desktop layout — unchanged ── */}
      <div className="hidden sm:flex sm:flex-row sm:flex-wrap sm:items-center gap-2">
        <div className="relative flex-1 min-w-0 sm:max-w-xs">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by order, dealer, staff, center…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        {dealerCombobox}
        {staffCombobox}
        {dateRange}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-7 text-xs text-muted-foreground"
          >
            <XIcon className="size-3.5" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
