import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatChipProps {
  children: ReactNode;
  accent?: boolean;
  className?: string;
}

export function StatChip({ children, accent, className }: StatChipProps) {
  return (
    <div className={cn(
      "rounded-md px-3 py-1.5 text-xs font-medium",
      accent ? "bg-accent/20 text-accent-foreground" : "bg-muted",
      className,
    )}>
      {children}
    </div>
  );
}
