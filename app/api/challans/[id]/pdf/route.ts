import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ordersQueries } from "@/lib/database/orders.queries";
import { withAuth, apiError, type RouteHandler } from "@/lib/api/auth-guard";
import { PERMISSIONS } from "@/constants/roles.constants";
import { formatDateMedium } from "@/lib/utils";
import type { OrderWithRelations } from "@/types/order.types";
import type { ChallanRow, OrganizationRow } from "@/types/database.types";

export const runtime = "nodejs";

// GET /api/challans/[id]/pdf — [id] is the order id (one challan per order).
// Returns a raw PDF, not the usual ApiResponse<T> envelope — cast the handler accordingly.
export const GET = withAuth(
  (async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }, { orgId }: { orgId: string }) => {
    const { id: orderId } = await ctx.params;
    const db = getSupabaseAdminClient();

    const orderRaw = await ordersQueries.getById(db, orderId, orgId).catch(() => null);
    if (!orderRaw) return apiError("Order not found", 404);
    const order = orderRaw as unknown as OrderWithRelations;

    const { data: challan } = await db
      .from("challans")
      .select("*")
      .eq("order_id", orderId)
      .eq("organization_id", orgId)
      .single();

    if (!challan) return apiError("No challan found for this order — dispatch from godown first", 404);

    const { data: org } = await db
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .single();

    if (!org) return apiError("Organization not found", 404);

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
    const page = await browser.newPage();
    await page.setContent(buildChallanHtml(order, challan, org), { waitUntil: "networkidle" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
    });
    await browser.close();

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${challan.challan_number}.pdf"`,
      },
    });
  }) as unknown as RouteHandler<unknown>,
  PERMISSIONS.CHALLAN_MANAGE
);

// ─── HTML builder ────────────────────────────────────────────────────────────

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildChallanHtml(order: OrderWithRelations, challan: ChallanRow, org: OrganizationRow): string {
  const dealer = order.dealer;
  const items = order.items ?? [];

  const rowsHtml = items
    .map((item) => {
      const seed = item.seed;
      const particulars = [seed?.crops?.name, seed?.variety].filter(Boolean).join(" — ") || "—";
      const isBag = item.unit === "Bag";
      const isPacket = item.unit === "Packet";
      const bagsCell = isBag ? String(item.quantity) : "—";
      const packetsCell = isPacket ? String(item.quantity) : item.unit === "Box" ? `${item.quantity} Box` : "—";

      return `<tr>
        <td>${esc(particulars)}</td>
        <td class="center mono">${esc(item.batch_number) || "—"}</td>
        <td class="center">${esc(seed?.pack_size) || "—"}</td>
        <td class="center">${bagsCell}</td>
        <td class="center">${packetsCell}</td>
        <td class="center">—</td>
      </tr>`;
    })
    .join("");

  const totalPieces = items.reduce((sum, item) => sum + item.quantity, 0);
  const emptyRows = Math.max(0, 8 - items.length);
  const fillerRows = Array.from({ length: emptyRows })
    .map(() => `<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; font-size: 12px; color: #1e293b; background: #fff; }
  .page { padding: 4px; }
  .border-box { border: 1.5px solid #1e3a8a; }

  /* ── Letterhead ── */
  .letterhead { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 10px; border-bottom: 2px solid #1e3a8a; margin-bottom: 0; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand img { width: 48px; height: 48px; object-fit: contain; border-radius: 50%; }
  .brand-name { font-size: 22px; font-weight: 800; color: #1e3a8a; letter-spacing: 0.01em; }
  .brand-addr { font-size: 10px; color: #475569; margin-top: 1px; line-height: 1.4; }
  .letterhead-right { text-align: right; }
  .challan-badge { display: inline-block; background: #1e3a8a; color: #fff; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; padding: 4px 12px; border-radius: 3px; }
  .contact { font-size: 10px; color: #334155; margin-top: 6px; line-height: 1.5; }
  .contact strong { color: #1e293b; }

  .licence-row { font-size: 10px; font-weight: 600; color: #1e3a8a; padding: 6px 0; border-bottom: 1.5px solid #1e3a8a; margin-bottom: 10px; }
  .licence-row span + span { margin-left: 16px; }

  /* ── To / Date box ── */
  .info-grid { display: flex; gap: 0; margin-bottom: 0; border: 1.5px solid #1e3a8a; border-radius: 8px 8px 0 0; overflow: hidden; }
  .to-box { flex: 1.4; border-right: 1.5px solid #1e3a8a; padding: 8px 10px; min-height: 70px; }
  .to-box .label { font-size: 10px; font-weight: 700; color: #1e3a8a; margin-bottom: 4px; }
  .to-box .dealer-name { font-size: 13px; font-weight: 700; }
  .to-box .dealer-meta { font-size: 10px; color: #475569; margin-top: 2px; }

  .meta-box { flex: 1; }
  .meta-row { display: flex; border-bottom: 1px solid #1e3a8a; }
  .meta-row:last-child { border-bottom: none; }
  .meta-row .meta-label { flex: 1; padding: 6px 10px; font-size: 10px; font-weight: 700; color: #1e3a8a; border-right: 1px solid #1e3a8a; }
  .meta-row .meta-value { flex: 1.3; padding: 6px 10px; font-size: 11px; font-weight: 600; }

  /* ── Party GST / Order No bar ── */
  .bar-row { display: flex; border: 1.5px solid #1e3a8a; border-top: none; background: #eef2f7; }
  .bar-row > div { flex: 1; padding: 6px 10px; font-size: 10px; font-weight: 600; color: #1e3a8a; }
  .bar-row > div:first-child { border-right: 1px solid #1e3a8a; }
  .bar-row span { color: #1e293b; font-weight: 700; margin-left: 4px; }

  /* ── Items table ── */
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  table.items { border: 1.5px solid #1e3a8a; border-top: none; border-radius: 0 0 8px 8px; overflow: hidden; }
  thead th { background: #fff; color: #1e3a8a; padding: 7px 8px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; border-right: 1px solid #1e3a8a; border-bottom: 1.5px solid #1e3a8a; }
  thead th:last-child { border-right: none; }
  tbody td { padding: 7px 8px; border-right: 1px solid #c7d2e8; border-bottom: 1px solid #c7d2e8; height: 26px; vertical-align: top; }
  tbody td:last-child { border-right: none; }
  tbody tr:last-child td { border-bottom: none; }
  td.center { text-align: center; }
  td.mono { font-family: monospace; font-size: 10px; }

  .total-row { border: 1.5px solid #1e3a8a; border-radius: 8px; margin-top: 10px; padding: 7px 14px; font-size: 11px; font-weight: 700; color: #1e293b; }

  /* ── Footer ── */
  .footer-box { border: 1.5px solid #1e3a8a; border-radius: 8px; margin-top: 10px; padding: 10px 14px; }
  .footer-top { display: flex; gap: 14px; }
  .notes-box { flex: 1.6; font-size: 9px; color: #1e293b; line-height: 1.6; }
  .gst-note-box { flex: 1; border: 1px solid #1e3a8a; padding: 8px 10px; font-size: 8.5px; color: #1e293b; line-height: 1.5; text-align: center; display: flex; align-items: center; }
  .prepared-box { flex: 1; text-align: center; }
  .prepared-box .prepared-label { font-size: 10px; color: #1e293b; }
  .prepared-box .prepared-name { font-size: 14px; font-weight: 800; color: #1e3a8a; margin-top: 26px; }

  .sign-row { margin-top: 18px; font-size: 10px; font-weight: 600; color: #1e293b; }
</style>
</head>
<body>
<div class="page">

  <!-- Letterhead -->
  <div class="letterhead">
    <div class="brand">
      ${org.logo_url ? `<img src="${esc(org.logo_url)}" alt="">` : ""}
      <div>
        <div class="brand-name">${esc(org.name).toUpperCase()}</div>
        ${org.address ? `<div class="brand-addr">${esc(org.address)}</div>` : ""}
      </div>
    </div>
    <div class="letterhead-right">
      <span class="challan-badge">DELIVERY CHALLAN</span>
      <div class="contact">
        ${org.phone
          ? org.phone
              .split(",")
              .map((n) => n.trim())
              .filter(Boolean)
              .map((n, i) => `<div>${i === 0 ? "Phone: " : ""}<strong>${esc(n)}</strong></div>`)
              .join("")
          : ""}
        ${org.email ? `<div>Email: <strong>${esc(org.email)}</strong></div>` : ""}
      </div>
    </div>
  </div>

  ${(org.seed_licence_number || org.gst_number) ? `
  <div class="licence-row">
    ${org.seed_licence_number ? `<span>SEED LICENCE NO. ${esc(org.seed_licence_number)}</span>` : ""}
    ${org.seed_licence_number && org.gst_number ? `<span>•</span>` : ""}
    ${org.gst_number ? `<span>GSTIN No.: ${esc(org.gst_number)}</span>` : ""}
  </div>` : `<div style="margin-bottom:10px"></div>`}

  <!-- To / Date / Challan No / Transport -->
  <div class="info-grid">
    <div class="to-box">
      <div class="label">To,</div>
      <div class="dealer-name">${esc(dealer?.name) || "—"}</div>
      ${dealer?.territory ? `<div class="dealer-meta">${esc(dealer.territory)}</div>` : ""}
      ${dealer?.contact ? `<div class="dealer-meta">${esc(dealer.contact)}</div>` : ""}
    </div>
    <div class="meta-box">
      <div class="meta-row">
        <div class="meta-label">Date</div>
        <div class="meta-value">${formatDateMedium(challan.godown_dispatch_date)}</div>
      </div>
      <div class="meta-row">
        <div class="meta-label">Challan No.</div>
        <div class="meta-value mono">${esc(challan.challan_number)}</div>
      </div>
      <div class="meta-row">
        <div class="meta-label">Transport</div>
        <div class="meta-value">${esc(challan.transport_name) || "—"}</div>
      </div>
    </div>
  </div>

  <div class="bar-row">
    <div>Party GST No.<span>—</span></div>
    <div>Order No.<span>${esc(order.order_number)}</span></div>
  </div>

  <!-- Items -->
  <table class="items">
    <thead>
      <tr>
        <th>Particulars</th>
        <th>Lot No.</th>
        <th>Weight Per Pkt./Bag</th>
        <th>Bags</th>
        <th>Packets</th>
        <th>Nett Weight (kg.)</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      ${fillerRows}
    </tbody>
  </table>

  <div class="total-row">TOTAL PIECES : ${totalPieces}</div>

  <!-- Footer -->
  <div class="footer-box">
    <div class="footer-top">
      <div class="notes-box">
        It is particularly requested that the goods be examined on receipt.<br>
        Please endorse the copy of D/S with your rubber stamp.<br>
        All complaints should be made within 4 days of receipt of goods.<br>
        Seals should not be removed without testing material form the bags.
      </div>
      <div class="gst-note-box">
        SEED, FRUIT AND SPORES OF A KIND USED FOR SOWING ITEM ARE EXEMPTED IN G.S.T. RATE SCHEDULE CODE NO. 1209. ITEM USED ONLY FOR SOWING PURPOSE.
      </div>
      <div class="prepared-box">
        <div class="prepared-label">Prepared By,</div>
        <div class="prepared-name">${esc(org.name).toUpperCase()}</div>
      </div>
    </div>
    <div class="sign-row">Receiver's Sign. With Stamp</div>
  </div>

</div>
</body>
</html>`;
}
