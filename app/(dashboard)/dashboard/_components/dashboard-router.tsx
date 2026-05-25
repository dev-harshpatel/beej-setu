"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { ROLES } from "@/constants/roles.constants";
import { ROUTES } from "@/constants/routes.constants";
import { DashboardClient } from "./dashboard-client";
import { StaffDashboard } from "./staff-dashboard";

export function DashboardRouter() {
  const { user } = useAuth();
  const router = useRouter();

  // Dispatch staff have no dashboard — send them straight to orders
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (user?.role === ROLES.DISPATCH_STAFF) {
      router.replace(ROUTES.ORDERS.ROOT);
    }
  }, [user?.role, router]);

  if (user?.role === ROLES.DISPATCH_STAFF) return null;
  if (user?.role === ROLES.STAFF) return <StaffDashboard />;

  return <DashboardClient />;
}
