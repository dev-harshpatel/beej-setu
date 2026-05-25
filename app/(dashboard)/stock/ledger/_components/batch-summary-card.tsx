"use client";

import { DownloadIcon, PrinterIcon, CheckCircle2Icon, AlertTriangleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BatchWithStatus, BatchSummary, ReconciliationResult } from "@/lib/database/stock-movements.queries";

interface Props {
  batch: BatchWithStatus;
  summary: BatchSummary;
  reconciliation: ReconciliationResult | null;
  onExportCsv: () => void;
  onPrint: () => void;
}

function packetsToDisplay(packets: number, ppb: number) {
  return { bags: Math.floor(packets / ppb), pkts: packets % ppb };
}

function StatCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

export function BatchSummaryCard({ batch, summary, reconciliation, onExportCsv, onPrint }: Props) {
  const ppb = batch.packets_per_bag;

  const totalIn  = packetsToDisplay(summary.total_in_packets + summary.total_adj_in_packets, ppb);
  const dispatch = packetsToDisplay(summary.total_dispatched_packets, ppb);
  const netAdj   = summary.total_adj_in_packets - summary.total_adj_out_packets;
  const adjDisp  = packetsToDisplay(Math.abs(netAdj), ppb);

  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-4">
      {/* Header: batch identity */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm">
            {batch.crop_name} — {batch.variety} ({batch.pack_size})
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">Batch {batch.batch_number}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={onExportCsv}>
            <DownloadIcon className="size-3 mr-1" />CSV
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={onPrint}>
            <PrinterIcon className="size-3 mr-1" />Print
          </Button>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-y border-border">
        <StatCell
          label="Total IN"
          value={`${totalIn.bags} bags`}
          sub={totalIn.pkts > 0 ? `+ ${totalIn.pkts} pkts` : undefined}
        />
        <StatCell
          label="Dispatched"
          value={`${dispatch.bags} bags`}
          sub={dispatch.pkts > 0 ? `+ ${dispatch.pkts} pkts` : undefined}
        />
        <StatCell
          label="Net Corrections"
          value={`${netAdj >= 0 ? "+" : "-"}${adjDisp.bags} bags`}
          sub={adjDisp.pkts > 0 ? `${adjDisp.pkts} pkts` : undefined}
        />
        <StatCell
          label="Current Balance"
          value={`${batch.bag_stock} bags`}
          sub={`${batch.packet_stock} loose pkts`}
        />
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        {summary.first_movement_date && (
          <span>First entry: {new Date(summary.first_movement_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
        )}
        {summary.last_movement_date && (
          <span>Last movement: {new Date(summary.last_movement_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
        )}
        <span>Dealers served: {summary.distinct_dealers_count}</span>
        <span>Orders: {summary.orders_count}</span>
      </div>

      {/* Reconciliation badge */}
      {reconciliation !== null && (
        <div className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
          reconciliation.is_reconciled
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-destructive/10 text-destructive border border-destructive/20"
        )}>
          {reconciliation.is_reconciled ? (
            <><CheckCircle2Icon className="size-3.5 shrink-0" /> Reconciled — ledger matches stock</>
          ) : (
            <><AlertTriangleIcon className="size-3.5 shrink-0" /> Mismatch — discrepancy of {reconciliation.discrepancy} packets</>
          )}
        </div>
      )}
    </div>
  );
}
