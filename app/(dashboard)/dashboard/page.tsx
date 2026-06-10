import type { Metadata } from "next";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { DashboardRouter } from "./_components/dashboard-router";
import { requirePermission } from "@/lib/auth/require-permission";
import { PERMISSIONS } from "@/constants/roles.constants";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  await requirePermission(PERMISSIONS.DASHBOARD_VIEW);
  return (
    <div className="flex flex-col lg:h-full lg:overflow-hidden">
      <header className="sticky top-0 z-10 bg-background flex h-16 shrink-0 items-center gap-2 border-b px-4 sm:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        />
        <h1 className="text-sm font-medium">Dashboard</h1>
      </header>
      <div className="flex flex-col px-4 sm:px-5 pt-3 sm:pt-4 pb-4 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        <DashboardRouter />
      </div>
    </div>
  );
}
