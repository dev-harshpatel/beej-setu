import { SproutIcon } from "lucide-react";

interface SeedsEmptyProps {
  hasFilters: boolean;
}

export function SeedsEmpty({ hasFilters }: SeedsEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border py-16 text-muted-foreground">
      <SproutIcon className="size-8 opacity-40" />
      <p className="text-sm">
        {hasFilters ? "No products match your filters" : "No seed products found"}
      </p>
    </div>
  );
}
