"use client";

import { useEffect, useState } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/constants/roles.constants";
import type { DealerRow, ProfileRow } from "@/types/database.types";

export interface FilterItem {
  value: string;
  label: string;
}

export function useOrdersFilterData() {
  const { hasPermission }  = usePermissions();
  const canViewDealers     = hasPermission(PERMISSIONS.DEALERS_VIEW);
  const canViewUsers       = hasPermission(PERMISSIONS.USERS_VIEW);

  const [dealers, setDealers]     = useState<DealerRow[]>([]);
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

  const dealerItems: FilterItem[] = [
    { value: "", label: "All dealers" },
    ...dealers.map((d) => ({ value: d.id, label: d.name })),
  ];

  const staffItems: FilterItem[] = [
    { value: "", label: "All staff" },
    ...staffList.map((s) => ({ value: s.id, label: s.name })),
  ];

  return { dealerItems, staffItems, canViewDealers, canViewUsers };
}
