import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

interface StockHeaderProps {
  total: number;
  canManage: boolean;
  onAdd: () => void;
}

export function StockHeader({ total, canManage, onAdd }: StockHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-base font-semibold text-foreground">Seed Stock</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{total} batch{total !== 1 ? "es" : ""}</p>
      </div>
      {canManage && (
        <Button size="sm" onClick={onAdd} className="gap-1.5 bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent)]/80">
          <PlusIcon className="size-3.5" />
          Add Batch
        </Button>
      )}
    </div>
  );
}
