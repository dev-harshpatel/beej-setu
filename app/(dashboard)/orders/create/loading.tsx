import { Loader2Icon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export default function CreateOrderLoading() {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 sm:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        />
        <Skeleton className="h-4 w-36" />
      </header>
      <div className="flex flex-1 items-center justify-center overflow-y-auto">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    </>
  );
}
