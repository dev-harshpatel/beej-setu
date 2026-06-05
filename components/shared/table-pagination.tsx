"use client";

import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PAGINATION_DEFAULTS } from "@/constants/app.constants";

interface TablePaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

/** Returns page numbers to render, with `null` for ellipsis gaps. */
function buildPageRange(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | null)[] = [1];
  if (current > 3) pages.push(null);
  const start = Math.max(2, current - 1);
  const end   = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push(null);
  pages.push(total);
  return pages;
}

export function TablePagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  className,
}: TablePaginationProps) {
  const from  = Math.min((page - 1) * pageSize + 1, total);
  const to    = Math.min(page * pageSize, total);
  const pages = buildPageRange(page, totalPages);

  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>

      {/* ── Mobile layout (single row) ─────────────────────── */}
      <div className="flex flex-1 items-center justify-between gap-2 sm:hidden">
        {/* Compact result count */}
        <p className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
          <span className="font-medium text-foreground">{from}–{to}</span>
          <span className="text-muted-foreground"> / {total}</span>
        </p>

        {/* Prev · page indicator · Next */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline" size="icon-sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeftIcon className="size-3.5" />
          </Button>
          <span className="min-w-[3rem] text-center text-xs text-muted-foreground tabular-nums whitespace-nowrap">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline" size="icon-sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <ChevronRightIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Desktop layout ─────────────────────────────────── */}
      <div className="hidden sm:flex flex-1 items-center justify-between gap-4">
        {/* Left: result summary */}
        <p className="text-xs text-muted-foreground shrink-0">
          Showing{" "}
          <span className="font-medium text-foreground">{from}–{to}</span> of{" "}
          <span className="font-medium text-foreground">{total}</span>{" "}
          result{total !== 1 ? "s" : ""}
        </p>

        {/* Right: rows-per-page + numbered pages */}
        <div className="flex items-center gap-3">
          {onPageSizeChange && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Rows</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => { onPageSizeChange(Number(v)); onPageChange(1); }}
              >
                <SelectTrigger size="sm" className="w-16 text-xs">
                  <SelectValue>{pageSize}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PAGINATION_DEFAULTS.PAGE_SIZE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={String(s)} className="text-xs">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-1">
            <Button
              variant="outline" size="icon-sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeftIcon className="size-3.5" />
            </Button>

            {pages.map((p, i) =>
              p === null ? (
                <span
                  key={`ellipsis-${i}`}
                  className="flex size-7 items-center justify-center text-muted-foreground"
                >
                  <MoreHorizontalIcon className="size-3.5" />
                </span>
              ) : (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="icon-sm"
                  onClick={() => onPageChange(p)}
                  aria-label={`Page ${p}`}
                  aria-current={p === page ? "page" : undefined}
                >
                  <span className="text-xs">{p}</span>
                </Button>
              )
            )}

            <Button
              variant="outline" size="icon-sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              aria-label="Next page"
            >
              <ChevronRightIcon className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}
