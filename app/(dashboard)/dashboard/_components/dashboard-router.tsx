"use client";

import { useAuth } from "@/hooks/use-auth";
import { ROLES } from "@/constants/roles.constants";
import { DashboardClient } from "./dashboard-client";
import { StaffDashboard } from "./staff-dashboard";

export function DashboardRouter() {
  const { user } = useAuth();

  if (user?.role === ROLES.STAFF) {
    return <StaffDashboard />;
  }

  return <DashboardClient />;
}
