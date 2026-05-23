"use client";

import { useAuthStore } from "@/store/auth.store";
import { useStoreHydrated } from "@/hooks/use-store-hydrated";
import { ROLES } from "@/constants/roles.constants";
import { OrdersTabs } from "./orders-tabs";
import { StaffOrders } from "./staff-orders";

export function OrdersRouter() {
  const hydrated = useStoreHydrated();
  const user = useAuthStore((s) => s.user);

  if (!hydrated) return null;

  if (user?.role === ROLES.STAFF) {
    return <StaffOrders />;
  }

  return <OrdersTabs />;
}
