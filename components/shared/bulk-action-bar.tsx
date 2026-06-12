"use client";

import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BulkActionBarProps {
  count: number;
  /** Singular entity name, e.g. "dealer" / "user". Pluralized with "s". */
  entity: string;
  onClear: () => void;
  onDelete: () => void;
}

export function BulkActionBar({ count, entity, onClear, onDelete }: BulkActionBarProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 mb-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm shrink-0">
      <span className="font-medium text-destructive">
        {count} {entity}{count !== 1 ? "s" : ""} selected
      </span>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClear}>
          Clear
        </Button>
        <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={onDelete}>
          <Trash2Icon className="size-3.5" />
          Delete {count}
        </Button>
      </div>
    </div>
  );
}
