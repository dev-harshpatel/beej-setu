import { WarehouseIcon } from "lucide-react";

export function StockEmpty({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border py-16 text-muted-foreground">
      <WarehouseIcon className="size-8 opacity-40" />
      <p className="text-sm">
        {hasFilters ? "No stock records match your filters" : "No stock batches found"}
      </p>
    </div>
  );
}
