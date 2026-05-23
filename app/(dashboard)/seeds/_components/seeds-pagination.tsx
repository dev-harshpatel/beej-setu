import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SeedsPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function SeedsPagination({ page, totalPages, onPageChange }: SeedsPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">Page {page} of {totalPages}</span>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}>
          <ChevronLeftIcon className="size-3.5" />Prev
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}>
          Next<ChevronRightIcon className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
