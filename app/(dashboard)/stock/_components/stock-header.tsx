import { Button } from "@/components/ui/button";
import { PlusIcon, UploadIcon } from "lucide-react";

interface StockHeaderProps {
  total: number;
  canManage: boolean;
  onAdd: () => void;
  onUpload: () => void;
}

export function StockHeader({ total, canManage, onAdd, onUpload }: StockHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-base font-semibold text-foreground">Seed Stock</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{total} batch{total !== 1 ? "es" : ""}</p>
      </div>
      {canManage && (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onUpload} className="gap-1.5">
            <UploadIcon className="size-3.5" />
            Upload Excel
          </Button>
          <Button size="sm" onClick={onAdd} className="gap-1.5 bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent)]/80">
            <PlusIcon className="size-3.5" />
            Add Batch
          </Button>
        </div>
      )}
    </div>
  );
}
