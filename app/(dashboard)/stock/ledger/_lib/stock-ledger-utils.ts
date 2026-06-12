import type { StockMovementEntry } from "@/lib/database/stock-movements.queries";

export const MOVEMENT_TYPE_BADGE: Record<string, string> = {
  ADD:            "bg-emerald-100 text-emerald-700",
  ADJUSTMENT_IN:  "bg-teal-100 text-teal-700",
  ADJUSTMENT_OUT: "bg-orange-100 text-orange-600",
  DISPATCH:       "bg-destructive/15 text-destructive",
};

export const MOVEMENT_TYPE_SIGN: Record<string, string> = {
  ADD:            "+",
  ADJUSTMENT_IN:  "+",
  ADJUSTMENT_OUT: "−",
  DISPATCH:       "−",
};

export function fmtQty(packets: number, ppb: number, sign: string): string {
  const bags = Math.floor(packets / ppb);
  const pkts = packets % ppb;
  const parts: string[] = [];
  if (bags > 0) parts.push(`${sign}${bags} bags`);
  if (pkts > 0) parts.push(`${sign}${pkts} pkts`);
  if (parts.length === 0) parts.push(`${sign}0`);
  return parts.join(", ");
}

export function exportToCsv(movements: StockMovementEntry[], batchNumber: string): void {
  const headers = ["Date", "Type", "Qty (pkts)", "Balance (pkts)", "By", "Dealer", "Order", "Notes"];
  const rows = movements.map((m) => [
    m.movement_date,
    m.movement_type,
    (MOVEMENT_TYPE_SIGN[m.movement_type] === "+" ? "+" : "-") + m.quantity_packets,
    m.running_balance_packets,
    m.movement_by_profile?.name ?? "",
    m.order?.dealer?.name ?? "",
    m.order?.order_number ?? "",
    (m.notes ?? "").replace(/,/g, ";"),
  ]);
  const csv  = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `ledger-${batchNumber}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
