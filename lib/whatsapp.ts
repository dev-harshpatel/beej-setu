import type { DealerRow } from "@/types/database.types";

export interface OrderShareItem {
  cropName: string;
  seedName: string;
  unit: string;
  quantity: number;
  batchNumber?: string;
}

// ── New Order (Staff → places order) ─────────────────────────────────────────

export interface OrderShareParams {
  dealer: DealerRow;
  staffName?: string;
  center?: string;
  transportName?: string;
  notes?: string;
  items: OrderShareItem[];
}

export function buildOrderWhatsAppMessage(params: OrderShareParams): string {
  const { dealer, staffName, center, transportName, notes, items } = params;
  const date = _today();
  const lines: string[] = [];

  lines.push(`Date: ${date}`);
  lines.push("");
  lines.push(`*Dealer:* ${dealer.name}`);
  if (dealer.territory) lines.push(`*Territory:* ${dealer.territory}`);
  if (dealer.contact)   lines.push(`*Contact:* ${dealer.contact}`);
  if (staffName)        lines.push(`*Order by:* ${staffName}`);
  if (center)           lines.push(`*Center:* ${center}`);
  if (transportName)    lines.push(`*Transport:* ${transportName}`);
  lines.push("");
  lines.push("*Items:*");
  items.forEach((item, i) => {
    lines.push(`${i + 1}. ${item.cropName} — ${item.seedName} × ${item.quantity} ${item.unit}`);
  });
  if (notes) {
    lines.push("");
    lines.push(`*Delivery Instructions:* ${notes}`);
  }

  return lines.join("\n");
}

// ── Approval (Admin → approves order) ────────────────────────────────────────

export interface ApprovalShareParams {
  orderNumber: string;
  dealer: DealerRow;
  approvedBy?: string;
  transportName?: string;
  notes?: string;
  items: OrderShareItem[];
}

export function buildApprovalWhatsAppMessage(params: ApprovalShareParams): string {
  const { orderNumber, dealer, approvedBy, transportName, notes, items } = params;
  const date = _today();
  const lines: string[] = [];

  lines.push("*Order Approved*");
  lines.push(`Order: ${orderNumber}`);
  lines.push(`Date: ${date}`);
  if (approvedBy) lines.push(`*Approved by:* ${approvedBy}`);
  lines.push("");
  lines.push(`*Dealer:* ${dealer.name}`);
  if (dealer.contact)   lines.push(`*Contact:* ${dealer.contact}`);
  if (transportName)    lines.push(`*Transport:* ${transportName}`);
  lines.push("");
  lines.push("*Items:*");
  items.forEach((item, i) => {
    const batch = item.batchNumber ? ` [Batch: ${item.batchNumber}]` : "";
    lines.push(`${i + 1}. ${item.cropName} — ${item.seedName} × ${item.quantity} ${item.unit}${batch}`);
  });

  const totals: Record<string, number> = {};
  for (const item of items) {
    totals[item.unit] = (totals[item.unit] ?? 0) + item.quantity;
  }
  const totalStr = Object.entries(totals)
    .map(([u, q]) => `${q} ${u}${q !== 1 ? "s" : ""}`)
    .join(" + ");
  if (totalStr) {
    lines.push("");
    lines.push(`*Total: ${totalStr}*`);
  }

  if (notes) {
    lines.push("");
    lines.push(`*Delivery Instructions:* ${notes}`);
  }

  return lines.join("\n");
}

// ── Godown Dispatch ───────────────────────────────────────────────────────────

export interface GodownDispatchShareParams {
  orderNumber: string;
  godownDispatchDate: string;
  dealer: DealerRow;
  transport?: string;
  dispatchedBy?: string;
  notes?: string;
  items: OrderShareItem[];
}

export function buildGodownDispatchWhatsAppMessage(params: GodownDispatchShareParams): string {
  const { orderNumber, godownDispatchDate, dealer, transport, dispatchedBy, notes, items } = params;
  const lines: string[] = [];

  lines.push("*Godown Dispatch*");
  lines.push(`Order: ${orderNumber}`);
  lines.push(`Godown Dispatch Date: ${_fmt(godownDispatchDate)}`);
  if (dispatchedBy) lines.push(`*Dispatched by:* ${dispatchedBy}`);
  lines.push("");
  lines.push(`*Dealer:* ${dealer.name}`);
  if (dealer.territory) lines.push(`*Territory:* ${dealer.territory}`);
  if (dealer.contact)   lines.push(`*Contact:* ${dealer.contact}`);
  if (transport)        lines.push(`*Transport:* ${transport}`);
  lines.push("");
  lines.push("*Items Dispatched:*");
  items.forEach((item, i) => {
    const batch = item.batchNumber ? ` [Batch: ${item.batchNumber}]` : "";
    lines.push(`${i + 1}. ${item.cropName} — ${item.seedName} × ${item.quantity} ${item.unit}${batch}`);
  });

  // Unit totals
  const totals: Record<string, number> = {};
  for (const item of items) {
    totals[item.unit] = (totals[item.unit] ?? 0) + item.quantity;
  }
  const totalStr = Object.entries(totals).map(([u, q]) => `${q} ${u}${q !== 1 ? "s" : ""}`).join(" + ");
  if (totalStr) {
    lines.push("");
    lines.push(`*Total: ${totalStr}*`);
  }

  if (notes) {
    lines.push("");
    lines.push(`*Delivery Instructions:* ${notes}`);
  }

  return lines.join("\n");
}

// ── Transport Dispatch ────────────────────────────────────────────────────────

export interface TransportDispatchShareParams {
  orderNumber: string;
  dealer: DealerRow;
  transport?: string;
  lrNumber?: string;
  transportDate?: string;
  items: OrderShareItem[];
}

export function buildTransportDispatchWhatsAppMessage(params: TransportDispatchShareParams): string {
  const { orderNumber, dealer, transport, lrNumber, transportDate, items } = params;
  const lines: string[] = [];

  lines.push("*Transport Dispatched*");
  lines.push(`Order: ${orderNumber}`);
  lines.push("");
  lines.push(`*Deliver To:* ${dealer.name}`);
  if (dealer.territory) lines.push(`*Territory:* ${dealer.territory}`);
  if (dealer.contact)   lines.push(`*Contact:* ${dealer.contact}`);
  if (transport)        lines.push(`*Transport:* ${transport}`);
  lines.push("");
  if (lrNumber)       lines.push(`Transport LR No: ${lrNumber}`);
  if (transportDate)  lines.push(`Transport Dispatch Date: ${_fmt(transportDate)}`);
  lines.push("");
  lines.push("*Items:*");
  items.forEach((item, i) => {
    const batch = item.batchNumber ? ` [Batch: ${item.batchNumber}]` : "";
    lines.push(`${i + 1}. ${item.cropName} — ${item.seedName} × ${item.quantity} ${item.unit}${batch}`);
  });

  const totals: Record<string, number> = {};
  for (const item of items) {
    totals[item.unit] = (totals[item.unit] ?? 0) + item.quantity;
  }
  const totalStr = Object.entries(totals).map(([u, q]) => `${q} ${u}${q !== 1 ? "s" : ""}`).join(", ");
  if (totalStr) {
    lines.push("");
    lines.push(`*Total: ${totalStr}*`);
  }

  return lines.join("\n");
}

// ── Collection (Staff → records payment) ─────────────────────────────────────

export interface CollectionShareParams {
  dealerName: string;
  amount: number;
  paymentMode: string;
  collectionDate: string;
  staffName?: string;
  notes?: string;
}

export function buildCollectionWhatsAppMessage(params: CollectionShareParams): string {
  const { dealerName, amount, paymentMode, collectionDate, staffName, notes } = params;
  const lines: string[] = [];

  const modeLabel: Record<string, string> = {
    CASH: "Cash", BANK_TRANSFER: "Bank Transfer", UPI: "UPI", CHEQUE: "Cheque",
  };

  lines.push("*Collection Recorded*");
  lines.push(`Date: ${_fmt(collectionDate)}`);
  if (staffName) lines.push(`*Recorded by:* ${staffName}`);
  lines.push("");
  lines.push(`*Dealer:* ${dealerName}`);
  lines.push(`*Amount:* ₹${amount.toLocaleString("en-IN")}`);
  lines.push(`*Mode:* ${modeLabel[paymentMode] ?? paymentMode}`);
  if (notes) {
    lines.push("");
    lines.push(`*Notes:* ${notes}`);
  }

  return lines.join("\n");
}

// ── Shared ────────────────────────────────────────────────────────────────────

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

function _today(): string {
  return new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function _fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
