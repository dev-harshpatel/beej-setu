import type { Metadata } from "next";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { requirePermission } from "@/lib/auth/require-permission";
import { PERMISSIONS, ROLES } from "@/constants/roles.constants";
import { OrdersDateWisePage } from "./_components/orders-date-wise-page";

export const metadata: Metadata = { title: "Date-wise Orders" };

export default async function OrdersDateWiseRoute() {
  const profile = await requirePermission(PERMISSIONS.REPORTS_VIEW);
  const staffId = profile.role === ROLES.STAFF ? profile.id : null;

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 sm:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
        <h1 className="text-sm font-medium">Date-wise Orders</h1>
      </header>
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-4 pb-6">
        <OrdersDateWisePage staffId={staffId} />
      </div>
    </>
  );
}
