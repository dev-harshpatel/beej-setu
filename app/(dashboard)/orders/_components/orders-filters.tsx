"use client";

import { useEffect, useState } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-0 sm:max-w-xs">
        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search order ID…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {/* Dealer — only for roles with dealer visibility */}
      {canViewDealers && (
        <Select value={dealerId || undefined} onValueChange={(v) => onDealerChange(v ?? "")}>
          <SelectTrigger size="sm" className="w-full sm:w-40">
            <SelectValue placeholder="All dealers" />
          </SelectTrigger>
          <SelectContent>
            {dealers.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                No dealers found
              </div>
            ) : (
              dealers.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      )}

      {/* Staff — only for roles with user visibility */}
      {canViewUsers && (
        <Select value={staffId || undefined} onValueChange={(v) => onStaffChange(v ?? "")}>
          <SelectTrigger size="sm" className="w-full sm:w-40">
            <SelectValue placeholder="All staff" />
          </SelectTrigger>
          <SelectContent>
            {staffList.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                No staff found
              </div>
            ) : (
              staffList.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      )}

      {/* Date range */}
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

      {/* Reset */}
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
  );
}
