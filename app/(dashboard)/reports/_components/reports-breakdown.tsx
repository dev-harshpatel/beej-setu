"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { TerritoryBreakdown, StaffBreakdown } from "@/lib/database/reports.queries";

// ── Shared mini progress bar ─────────────────────────────────────────────────

function MiniBar({ value, total, colorClass }: { value: number; total: number; colorClass: string }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 shrink-0 text-right tabular-nums text-xs text-foreground">{value}</span>
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Skeleton rows shared helper ───────────────────────────────────────────────

function SkeletonRows({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full max-w-24" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ── Territory Breakdown ───────────────────────────────────────────────────────

interface TerritoryBreakdownTableProps {
  data: TerritoryBreakdown[];
  loading: boolean;
  /** When a territory filter is already active, this table is collapsed */
  activeTerritory?: string;
  onTerritoryClick?: (territory: string) => void;
}

export function TerritoryBreakdownTable({
  data,
  loading,
  activeTerritory,
  onTerritoryClick,
}: TerritoryBreakdownTableProps) {
  const isEmpty = !loading && data.length === 0;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 sm:px-5 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Territory Breakdown</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {activeTerritory
            ? `Showing stats for: ${activeTerritory}`
            : "Orders grouped by dealer territory"}
        </p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Territory</TableHead>
              <TableHead className="text-right w-16">Total</TableHead>
              <TableHead>Pending</TableHead>
              <TableHead>Approved</TableHead>
              <TableHead className="hidden sm:table-cell">Cancelled</TableHead>
              <TableHead className="hidden md:table-cell">Delivered</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <SkeletonRows cols={6} />
            ) : isEmpty ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No data for the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow
                  key={row.territory}
                  className={onTerritoryClick && !activeTerritory ? "cursor-pointer hover:bg-accent/40" : ""}
                  onClick={() => !activeTerritory && onTerritoryClick?.(row.territory)}
                >
                  <TableCell className="font-medium text-sm">{row.territory}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums text-sm">
                    {row.total}
                  </TableCell>
                  <TableCell>
                    <MiniBar value={row.pending} total={row.total} colorClass="bg-warning" />
                  </TableCell>
                  <TableCell>
                    <MiniBar value={row.approved} total={row.total} colorClass="bg-success" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <MiniBar value={row.cancelled} total={row.total} colorClass="bg-destructive" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <MiniBar value={row.shipped} total={row.total} colorClass="bg-primary" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && !isEmpty && !activeTerritory && onTerritoryClick && (
        <p className="px-4 py-2 text-xs text-muted-foreground border-t border-border">
          Click a row to filter by territory.
        </p>
      )}
    </div>
  );
}

// ── Staff Breakdown ───────────────────────────────────────────────────────────

interface StaffBreakdownTableProps {
  data: StaffBreakdown[];
  loading: boolean;
  activeStaffId?: string;
  onStaffClick?: (staffId: string) => void;
}

export function StaffBreakdownTable({
  data,
  loading,
  activeStaffId,
  onStaffClick,
}: StaffBreakdownTableProps) {
  const isEmpty = !loading && data.length === 0;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 sm:px-5 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Staff Breakdown</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {activeStaffId
            ? `Showing stats for selected staff member`
            : "Orders grouped by staff member"}
        </p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Staff Member</TableHead>
              <TableHead className="hidden sm:table-cell">Territory</TableHead>
              <TableHead className="text-right w-16">Total</TableHead>
              <TableHead>Pending</TableHead>
              <TableHead>Approved</TableHead>
              <TableHead className="hidden md:table-cell">Cancelled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <SkeletonRows cols={6} />
            ) : isEmpty ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No data for the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow
                  key={row.staffId}
                  className={onStaffClick && !activeStaffId ? "cursor-pointer hover:bg-accent/40" : ""}
                  onClick={() => !activeStaffId && onStaffClick?.(row.staffId)}
                >
                  <TableCell className="font-medium text-sm">{row.staffName}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {row.territory ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums text-sm">
                    {row.total}
                  </TableCell>
                  <TableCell>
                    <MiniBar value={row.pending} total={row.total} colorClass="bg-warning" />
                  </TableCell>
                  <TableCell>
                    <MiniBar value={row.approved} total={row.total} colorClass="bg-success" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <MiniBar value={row.cancelled} total={row.total} colorClass="bg-destructive" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && !isEmpty && !activeStaffId && onStaffClick && (
        <p className="px-4 py-2 text-xs text-muted-foreground border-t border-border">
          Click a row to filter by staff member.
        </p>
      )}
    </div>
  );
}
