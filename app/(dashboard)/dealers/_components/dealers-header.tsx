import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DealersHeaderProps {
  total: number;
  canCreate: boolean;
  onAdd: () => void;
}

export function DealersHeader({ total, canCreate, onAdd }: DealersHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Dealers</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {total > 0 ? `${total} dealer${total !== 1 ? "s" : ""}` : "Manage your dealer network"}
        </p>
      </div>
      {canCreate && (
        <Button size="sm" className="w-full sm:w-auto gap-1.5" onClick={onAdd}>
          <PlusIcon className="size-4" />
          Add Dealer
        </Button>
      )}
    </div>
  );
}
