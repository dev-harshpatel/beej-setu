import type { Metadata } from "next";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { DealersPage } from "./_components/dealers-page";

export const metadata: Metadata = {
  title: "Dealers",
};

export default function DealersRoute() {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 sm:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
        <h1 className="text-sm font-medium">Dealers</h1>
      </header>
      <div className="flex-1 overflow-y-auto px-4 sm:px-5 pt-3 sm:pt-4">
        <DealersPage />
      </div>
    </>
  );
}
