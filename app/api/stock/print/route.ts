import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { stockMovementsQueries } from "@/lib/database/stock-movements.queries";
import { withAuth, apiError, type RouteHandler } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";
import type { BatchSummary, ReconciliationResult, StockMovementEntry } from "@/lib/database/stock-movements.queries";

export const runtime = "nodejs";

// GET /api/stock/print?seedId=&batchNumber=
// Returns a raw PDF, not the usual ApiResponse<T> envelope — cast the handler accordingly.
export const GET = withAuth(
  (async (req: NextRequest, _ctx: { params: Promise<Record<string, string>> }, { orgId }: { orgId: string }) => {
    const { searchParams } = req.nextUrl;
    const seedId      = searchParams.get("seedId");
    const batchNumber = searchParams.get("batchNumber");

    if (!seedId || !batchNumber) {
      return apiError("seedId and batchNumber are required", 400);
    }

    const db = getSupabaseAdminClient();

    // Fetch batch details
    const { data: raw, error: batchErr } = await db
      .from("seed_stock")
      .select(
        "seed_id, batch_number, bag_stock, packet_stock, seed_product:seed_products!inner(variety, pack_size, packets_per_bag, crop:crops!inner(name))"
      )
      .eq("organization_id", orgId)
      .eq("seed_id", seedId)
      .eq("batch_number", batchNumber)
      .single();

    if (batchErr || !raw) return apiError("Batch not found", 404);

    const batch = raw as unknown as {
      seed_id: string;
      batch_number: string;
      bag_stock: number;
      packet_stock: number;
      seed_product: { variety: string; pack_size: string; packets_per_bag: number; crop: { name: string } };
    };

    // Fetch ALL movements (no pagination)
    const { movements, summary } = await stockMovementsQueries.getMovements(
      db, orgId, seedId, batchNumber, { pageSize: 5000 }
    );

    // Fetch reconciliation (best-effort)
    let reconciliation: ReconciliationResult | null = null;
    try {
      reconciliation = await stockMovementsQueries.getReconciliation(db, orgId, seedId, batchNumber);
    } catch { /* ignore */ }

    // Generate PDF via Playwright (local) or @sparticuz/chromium (Vercel/serverless)
    const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    let chromiumModule: typeof import("playwright").chromium;
    let executablePath: string | undefined;
    let launchArgs: string[] | undefined;

    if (isServerless) {
      const sparticuzChromium = (await import("@sparticuz/chromium")).default;
      executablePath = await sparticuzChromium.executablePath();
      launchArgs = sparticuzChromium.args;
      chromiumModule = (await import("playwright-core")).chromium;
    } else {
      chromiumModule = (await import("playwright")).chromium;
    }

    const browser = await chromiumModule.launch({
      ...(executablePath ? { executablePath } : {}),
      ...(launchArgs ? { args: launchArgs } : {}),
    });
    const page    = await browser.newPage();
    await page.setContent(buildHtml(batch, movements, summary, reconciliation), { waitUntil: "networkidle" });
    const pdf = await page.pdf({
      format:          "A4",
      printBackground: true,
      margin:          { top: "16mm", bottom: "16mm", left: "16mm", right: "16mm" },
    });
    await browser.close();

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="${batchNumber}-ledger.pdf"`,
      },
    });
  }) as unknown as RouteHandler<unknown>,
  PERMISSIONS.STOCK_VIEW
);

// ─── HTML builder ────────────────────────────────────────────────────────────

type BatchData = {
  seed_id: string;
  batch_number: string;
  bag_stock: number;
  packet_stock: number;
  seed_product: { variety: string; pack_size: string; packets_per_bag: number; crop: { name: string } };
};

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtQty(packets: number, ppb: number, sign: string): string {
  const bags = Math.floor(packets / ppb);
  const pkts = packets % ppb;
  const parts: string[] = [];
  if (bags > 0) parts.push(`${sign}${bags} bags`);
  if (pkts > 0) parts.push(`${sign}${pkts} pkts`);
  if (parts.length === 0) parts.push(`${sign}0`);
  return parts.join(", ");
}

const SIGN: Record<string, string> = {
  ADD: "+", ADJUSTMENT_IN: "+", ADJUSTMENT_OUT: "−", DISPATCH: "−",
};

const TYPE_STYLE: Record<string, string> = {
  ADD:            "background:#d1fae5;color:#065f46",
  ADJUSTMENT_IN:  "background:#ccfbf1;color:#0f766e",
  ADJUSTMENT_OUT: "background:#ffedd5;color:#c2410c",
  DISPATCH:       "background:#fee2e2;color:#b91c1c",
};

function buildHtml(
  batch:          BatchData,
  movements:      StockMovementEntry[],
  summary:        BatchSummary,
  reconciliation: ReconciliationResult | null
): string {
  const ppb      = batch.seed_product.packets_per_bag;
  const sp       = batch.seed_product;
  const now      = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const totalIn  = summary.total_in_packets + summary.total_adj_in_packets;
  const netAdj   = summary.total_adj_in_packets - summary.total_adj_out_packets;

  const statRow = (label: string, val: string, sub?: string) =>
    `<div class="stat">
      <div class="stat-label">${label}</div>
      <div class="stat-value">${val}</div>
      ${sub ? `<div class="stat-sub">${sub}</div>` : ""}
    </div>`;

  const inBags  = Math.floor(totalIn / ppb);
  const inPkts  = totalIn % ppb;
  const disBags = Math.floor(summary.total_dispatched_packets / ppb);
  const disPkts = summary.total_dispatched_packets % ppb;
  const adjBags = Math.floor(Math.abs(netAdj) / ppb);
  const adjPkts = Math.abs(netAdj) % ppb;

  const recoHtml = reconciliation !== null
    ? reconciliation.is_reconciled
      ? `<div class="badge badge-ok">✓ Reconciled — ledger matches stock</div>`
      : `<div class="badge badge-err">⚠ Mismatch — discrepancy of ${reconciliation.discrepancy} packets</div>`
    : "";

  const rowsHtml = movements.map((m) => {
    const sign   = SIGN[m.movement_type] ?? "+";
    const rb     = m.running_balance_packets;
    const rbBags = Math.floor(rb / ppb);
    const rbPkts = rb % ppb;

    let actor = "";
    if (m.movement_type === "DISPATCH") {
      const parts: string[] = [];
      if (m.movement_by_profile)  parts.push(`<span class="actor-staff">${m.movement_by_profile.name}</span>`);
      if (m.order?.dealer)        parts.push(`<span class="actor-dealer">→ ${m.order.dealer.name}</span>`);
      if (m.order?.order_number)  parts.push(`<span class="actor-order">${m.order.order_number}</span>`);
      actor = parts.join("<br>");
    } else {
      actor = m.movement_by_profile?.name ?? "—";
    }

    const balStr = rbBags > 0 && rbPkts > 0
      ? `${rbBags} bags, ${rbPkts} pkts`
      : rbBags > 0 ? `${rbBags} bags` : `${rbPkts} pkts`;

    return `<tr>
      <td class="nowrap">${fmtDate(m.movement_date)}</td>
      <td><span class="type-badge" style="${TYPE_STYLE[m.movement_type] ?? ""}">${m.movement_type.replace("_", " ")}</span></td>
      <td class="right nowrap">${fmtQty(m.quantity_packets, ppb, sign)}</td>
      <td class="right nowrap">${balStr}</td>
      <td>${actor}</td>
      <td class="notes">${m.notes ?? ""}</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; font-size: 12px; color: #111827; background: #fff; }

  .page { padding: 0; }

  /* ── Header ── */
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px; border-bottom: 2px solid #111827; margin-bottom: 18px; }
  .header-left h1 { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
  .header-left p  { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .header-right   { text-align: right; font-size: 10px; color: #6b7280; line-height: 1.6; }
  .header-right strong { color: #111827; font-size: 11px; }

  /* ── Batch identity ── */
  .batch-name   { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
  .batch-number { font-size: 10px; color: #6b7280; font-family: monospace; margin-bottom: 14px; }

  /* ── Stats ── */
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 14px; }
  .stat { padding: 10px 14px; border-right: 1px solid #e5e7eb; background: #f9fafb; }
  .stat:last-child { border-right: none; }
  .stat-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; margin-bottom: 4px; }
  .stat-value { font-size: 16px; font-weight: 700; color: #111827; }
  .stat-sub   { font-size: 10px; color: #6b7280; margin-top: 1px; }

  /* ── Meta row ── */
  .meta { display: flex; flex-wrap: wrap; gap: 20px; font-size: 10px; color: #6b7280; margin-bottom: 12px; }

  /* ── Reconciliation badge ── */
  .badge     { display: inline-block; padding: 5px 10px; border-radius: 6px; font-size: 10px; font-weight: 600; margin-bottom: 18px; }
  .badge-ok  { background: #ecfdf5; color: #065f46; border: 1px solid #6ee7b7; }
  .badge-err { background: #fef2f2; color: #991b1b; border: 1px solid #fca5a5; }

  /* ── Section header ── */
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px solid #e5e7eb; }

  /* ── Table ── */
  table  { width: 100%; border-collapse: collapse; font-size: 11px; }
  thead  { }
  th     { background: #f3f4f6; padding: 7px 10px; text-align: left; font-weight: 600; color: #374151; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #d1d5db; }
  th.right { text-align: right; }
  td     { padding: 7px 10px; vertical-align: top; border-bottom: 1px solid #f3f4f6; }
  td.right  { text-align: right; }
  td.nowrap { white-space: nowrap; }
  td.notes  { color: #6b7280; font-size: 10px; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: #fafafa; }

  .type-badge { display: inline-block; padding: 2px 7px; border-radius: 9999px; font-size: 9px; font-weight: 700; white-space: nowrap; }
  .actor-staff  { font-weight: 500; display: block; }
  .actor-dealer { color: #6b7280; display: block; font-size: 10px; }
  .actor-order  { color: #2563eb; display: block; font-size: 10px; }

  /* ── Footer ── */
  .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 9px; color: #9ca3af; }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <h1>Stock Ledger</h1>
      <p>Beej Setu — Seed Management</p>
    </div>
    <div class="header-right">
      <strong>${batch.batch_number}</strong><br>
      Printed: ${now}
    </div>
  </div>

  <!-- Batch identity -->
  <div class="batch-name">${sp.crop.name} — ${sp.variety} (${sp.pack_size})</div>
  <div class="batch-number">Batch ${batch.batch_number}</div>

  <!-- Stats -->
  <div class="stats">
    ${statRow("Total IN",        `${inBags > 0 ? inBags + " bags" : ""}`,  inPkts > 0 ? `+ ${inPkts} pkts` : inBags === 0 ? "0" : undefined)}
    ${statRow("Dispatched",      `${disBags > 0 ? disBags + " bags" : ""}`, disPkts > 0 ? `+ ${disPkts} pkts` : disBags === 0 ? "0" : undefined)}
    ${statRow("Net Corrections", `${netAdj >= 0 ? "+" : "−"}${adjBags} bags`, adjPkts > 0 ? `${adjPkts} pkts` : undefined)}
    ${statRow("Current Balance", `${batch.bag_stock} bags`,                 `${batch.packet_stock} loose pkts`)}
  </div>

  <!-- Meta -->
  <div class="meta">
    ${summary.first_movement_date ? `<span>First entry: <strong>${fmtDate(summary.first_movement_date)}</strong></span>` : ""}
    ${summary.last_movement_date  ? `<span>Last movement: <strong>${fmtDate(summary.last_movement_date)}</strong></span>` : ""}
    <span>Dealers served: <strong>${summary.distinct_dealers_count}</strong></span>
    <span>Orders: <strong>${summary.orders_count}</strong></span>
    <span>Total movements: <strong>${movements.length}</strong></span>
  </div>

  <!-- Reconciliation -->
  ${recoHtml}

  <!-- Movement history -->
  <div class="section-title">Movement History</div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Type</th>
        <th class="right">Quantity</th>
        <th class="right">Balance After</th>
        <th>Actor</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || `<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:20px">No movements found</td></tr>`}
    </tbody>
  </table>

  <!-- Footer -->
  <div class="footer">
    <span>Batch ${batch.batch_number} — ${sp.crop.name} ${sp.variety} ${sp.pack_size}</span>
    <span>Generated by Beej Setu</span>
  </div>

</div>
</body>
</html>`;
}
