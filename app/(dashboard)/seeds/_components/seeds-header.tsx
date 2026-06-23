import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SeedsHeaderProps {
  total: number;
  canCreate?: boolean;
  onAdd?: () => void;
}

export function SeedsHeader({ total, canCreate = false, onAdd }: SeedsHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="hidden sm:block">
        <h2 className="text-xl font-semibold text-foreground">Seed Products</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {total > 0 ? `${total} product${total !== 1 ? "s" : ""}` : "Seed product catalogue"}
        </p>
      </div>
      {canCreate && (
        <Button
          size="sm"
          onClick={onAdd}
          className="bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent)]/80 ml-auto"
        >
          <PlusIcon className="size-3.5 mr-1.5" />
          Add Product
        </Button>
      )}
    </div>
  );
}
