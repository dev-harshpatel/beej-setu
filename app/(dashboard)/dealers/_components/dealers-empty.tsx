import { StoreIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DealersEmptyProps {
  hasFilters: boolean;
  canCreate: boolean;
  onAdd: () => void;
}

export function DealersEmpty({ hasFilters, canCreate, onAdd }: DealersEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border py-16 text-muted-foreground">
      <StoreIcon className="size-8 opacity-40" />
      <p className="text-sm">
        {hasFilters ? "No dealers match your filters" : "No dealers added yet"}
      </p>
      {!hasFilters && canCreate && (
        <Button size="sm" variant="outline" className="gap-1.5" onClick={onAdd}>
          <PlusIcon className="size-4" />
          Add first dealer
        </Button>
      )}
    </div>
  );
}
