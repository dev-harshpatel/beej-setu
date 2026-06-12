"use client";

import type { ReactNode } from "react";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReportFilterBarProps {
  children: ReactNode;
  onGenerate: () => void;
  onClear: () => void;
  loading: boolean;
  hasReport: boolean;
  disabled?: boolean;
  note?: ReactNode;
}

export function ReportFilterBar({
  children, onGenerate, onClear, loading, hasReport, disabled, note,
}: ReportFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-3 items-end rounded-lg border border-border p-4 bg-card">
      {children}
      <div className="flex gap-2 items-end">
        <Button onClick={onGenerate} disabled={disabled || loading}>
          {loading ? "Loading…" : "Generate Report"}
        </Button>
        {hasReport && (
          <Button variant="ghost" size="icon" onClick={onClear} title="Clear report">
            <XIcon className="size-4" />
          </Button>
        )}
      </div>
      {note}
    </div>
  );
}
