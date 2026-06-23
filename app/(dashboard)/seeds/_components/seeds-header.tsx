"use client";

import { SearchIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SeedsHeaderProps {
  total: number;
  canCreate?: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  onAdd?: () => void;
}

export function SeedsHeader({ total, canCreate = false, search = "", onSearchChange, onAdd }: SeedsHeaderProps) {
  return (
    <>
      {/* Desktop: title row */}
      <div className="hidden sm:flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Seed Products</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total > 0 ? `${total} product${total !== 1 ? "s" : ""}` : "Seed product catalogue"}
          </p>
        </div>
        {canCreate && (
          <Button
            size="sm"
            onClick={onAdd}
            className="bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent)]/80"
          >
            <PlusIcon className="size-3.5" />
            Add Product
          </Button>
        )}
      </div>

      {/* Mobile: search + add button in one row */}
      <div className="flex sm:hidden items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search products…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        {canCreate && (
          <Button
            size="sm"
            onClick={onAdd}
            className="bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent)]/80 shrink-0 px-3"
            aria-label="Add product"
          >
            <PlusIcon className="size-4" />
          </Button>
        )}
      </div>
    </>
  );
}
