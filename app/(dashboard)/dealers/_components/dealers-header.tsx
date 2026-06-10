import { PlusIcon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DealersHeaderProps {
  total: number;
  canCreate: boolean;
  onAdd: () => void;
  onUpload: () => void;
}

export function DealersHeader({ total, canCreate, onAdd, onUpload }: DealersHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 sm:items-center">
      <div className="hidden sm:block">
        <h2 className="text-xl font-semibold text-foreground">Dealers</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {total > 0 ? `${total} dealer${total !== 1 ? "s" : ""}` : "Manage your dealer network"}
        </p>
      </div>
      {canCreate && (
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onUpload}>
            <UploadIcon className="size-3.5" />
            <span className="hidden sm:inline">Upload Sheet</span>
          </Button>
          <Button size="sm" className="gap-1.5" onClick={onAdd}>
            <PlusIcon className="size-4" />
            <span className="hidden sm:inline">Add Dealer</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      )}
    </div>
  );
}
