import { Button } from "@/components/ui/button";
import { PlusIcon, UploadIcon, RefreshCwIcon } from "lucide-react";

interface StockHeaderProps {
  total: number;
  canManage: boolean;
  isRefreshing?: boolean;
  onRefresh: () => void;
  onAdd: () => void;
  onUpload: () => void;
}

export function StockHeader({ total, canManage, isRefreshing, onRefresh, onAdd, onUpload }: StockHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-base font-semibold text-foreground">Seed Stock</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{total} batch{total !== 1 ? "es" : ""}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={onRefresh} disabled={isRefreshing} title="Refresh stock" className="gap-1.5">
          <RefreshCwIcon className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">{isRefreshing ? "Refreshing…" : "Refresh"}</span>
        </Button>
        {canManage && (
          <>
            <Button size="sm" variant="outline" onClick={onUpload} className="gap-1.5">
              <UploadIcon className="size-3.5" />
              Upload Excel
            </Button>
            <Button size="sm" onClick={onAdd} className="gap-1.5 bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent)]/80">
              <PlusIcon className="size-3.5" />
              Add Batch
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
