import type { Metadata } from "next";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { StockPage } from "./_components/stock-page";
import { requirePermission } from "@/lib/auth/require-permission";
import { PERMISSIONS } from "@/constants/roles.constants";

export const metadata: Metadata = {
  title: "Stock",
};

export default async function StockRoute() {
  await requirePermission(PERMISSIONS.STOCK_VIEW);
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 sm:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
        <h1 className="text-sm font-medium">Stock</h1>
      </header>
      <div className="flex-1 min-h-0 overflow-hidden">
        <StockPage />
      </div>
    </>
  );
}
