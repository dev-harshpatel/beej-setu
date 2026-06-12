"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  FileTextIcon,
  MapPinIcon,
  PackageIcon,
  TruckIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DatePicker } from "@/components/ui/date-picker";
import { WhatsAppSharePanel } from "@/app/(dashboard)/orders/_components/whatsapp-share-panel";
import { OrderStatusBadge } from "../../../_components/order-status-badge";
import {
  ORDER_STATUSES,
  CHALLAN_ELIGIBLE_STATUSES,
  TRANSPORT_UPDATE_ELIGIBLE_STATUSES,
} from "@/constants/order-status.constants";
import { ROUTES } from "@/constants/routes.constants";
import { formatDateLong, formatDateMedium } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import {
  buildGodownDispatchWhatsAppMessage,
  buildTransportDispatchWhatsAppMessage,
} from "@/lib/whatsapp";
import type { OrderWithRelations } from "@/types/order.types";
import type { ChallanRow } from "@/types/database.types";
import type { OrderStatusValue } from "@/constants/order-status.constants";
import { challanService } from "@/services/challan.service";

const CHALLAN_LOADED_STATUSES: OrderStatusValue[] = [
  ORDER_STATUSES.GODOWN_DISPATCHED,
  ORDER_STATUSES.TRANSPORT_DISPATCHED,
  ORDER_STATUSES.SHIPPED,
];

export default function ChallanPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: order, isLoading: loading, error } = useQuery({
    queryKey: ["order-challan", id],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error("Order not found.");
      return json.data as OrderWithRelations;
    },
    enabled: !!id,
    staleTime: 0,
  });

  const needsChallan = order && CHALLAN_LOADED_STATUSES.includes(order.status as OrderStatusValue);

  const { data: challan = null, isLoading: loadingChallan } = useQuery({
    queryKey: ["challan", id],
    queryFn: async () => {
      const res = await fetch(`/api/challans/${order!.id}`);
      const json = await res.json().catch(() => null);
      return json?.success && json.data ? (json.data as ChallanRow) : null;
    },
    enabled: !!needsChallan,
    staleTime: 0,
  });

  if (loading || (needsChallan && loadingChallan)) {
    return (
      <div className="flex flex-col min-h-full">
        <PageHeader onBack={() => router.push(ROUTES.ORDERS.ROOT)} orderNumber="…" />
        <div className="flex-1 flex items-center justify-center py-24 text-muted-foreground text-sm">
          Loading challan…
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col min-h-full">
        <PageHeader onBack={() => router.push(ROUTES.ORDERS.ROOT)} orderNumber="—" />
        <div className="flex-1 flex items-center justify-center py-24 text-destructive text-sm">
          {error instanceof Error ? error.message : "Order not found."}
        </div>
      </div>
    );
  }

  return <ChallanForm order={order} challan={challan} />;
}

// ── ChallanForm: form state initialised from order/challan at mount ───────────

function ChallanForm({
  order,
  challan,
}: {
  order: OrderWithRelations;
  challan: ChallanRow | null;
}) {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);

  const [transport, setTransport]           = useState(() => challan?.transport_name ?? order.dealer?.default_transport ?? "");
  const [challanNumber, setChallanNumber]   = useState(() => challan?.challan_number ?? `DC-${order.order_number}`);
  const [lrNumber, setLrNumber]             = useState(() => challan?.lr_number ?? "");
  const godownDate = new Date().toISOString().split("T")[0];
  const [transportDate, setTransportDate]   = useState("");

  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState<string | null>(null);
  const [whatsappMessage, setWhatsappMessage] = useState<string | null>(null);
  const [whatsappType, setWhatsappType]       = useState<"godown" | "transport" | null>(null);

  const status     = order.status as OrderStatusValue;
  const isCreating = CHALLAN_ELIGIBLE_STATUSES.includes(status);
  const isUpdating = TRANSPORT_UPDATE_ELIGIBLE_STATUSES.includes(status);
  const isViewOnly = !isCreating && !isUpdating;

  function buildShareItems() {
    return (order.items ?? []).map((item) => ({
      cropName:    item.seed?.crops?.name ?? "—",
      seedName:    item.seed?.variety ?? "—",
      unit:        item.unit,
      quantity:    item.quantity,
      batchNumber: item.batch_number ?? undefined,
    }));
  }

  async function handleGodownDispatch() {
    if (!challanNumber.trim()) { setFormError("Challan number is required."); return; }
    setSaving(true); setFormError(null);
    try {
      await challanService.dispatchGodown({
        orderId:             order.id,
        challanNumber:       challanNumber.trim(),
        transportName:       transport.trim() || undefined,
        godownDispatchDate:  godownDate,
      });
      const msg = buildGodownDispatchWhatsAppMessage({
        orderNumber:   order.order_number,
        challanNumber: challanNumber.trim(),
        dealer:        order.dealer!,
        transport:     transport.trim() || undefined,
        dispatchedBy:  currentUser?.name,
        notes:         order.notes ?? undefined,
        items:         buildShareItems(),
      });
      setWhatsappMessage(msg);
      setWhatsappType("godown");
    } catch (err: unknown) {
      setFormError((err as Error)?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTransportDispatch() {
    if (!transportDate) { setFormError("Transport dispatch date is required."); return; }
    setSaving(true); setFormError(null);
    try {
      await challanService.dispatchTransport(order.id, {
        transportDispatchDate: transportDate,
        lrNumber:              lrNumber.trim() || undefined,
        transportName:         transport.trim() || undefined,
      });
      const msg = buildTransportDispatchWhatsAppMessage({
        orderNumber:   order.order_number,
        challanNumber: challan?.challan_number ?? challanNumber.trim(),
        dealer:        order.dealer!,
        transport:     transport.trim() || undefined,
        lrNumber:      lrNumber.trim() || undefined,
        transportDate,
        dispatchedBy:  currentUser?.name,
        items:         buildShareItems(),
      });
      setWhatsappMessage(msg);
      setWhatsappType("transport");
    } catch (err: unknown) {
      setFormError((err as Error)?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const orderDate = formatDateLong(order.created_at);

  const unitTotals: Record<string, number> = {};
  for (const item of order.items ?? []) {
    const unit = item.unit ?? "Other";
    unitTotals[unit] = (unitTotals[unit] ?? 0) + item.quantity;
  }

  if (whatsappMessage) {
    return (
      <div className="flex flex-col min-h-full">
        <PageHeader onBack={() => router.push(ROUTES.ORDERS.ROOT)} orderNumber={order.order_number} />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <WhatsAppSharePanel
              message={whatsappMessage}
              title={whatsappType === "transport" ? "Share Transport Dispatch" : "Share Godown Dispatch"}
              subtitle="Send dispatch details to the group via WhatsApp."
              doneLabel="Go to Orders"
              expand
              onDone={() => router.push(ROUTES.ORDERS.ROOT)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader onBack={() => router.back()} orderNumber={order.order_number} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 pb-32 pt-4 space-y-4">

          {/* ── Order summary card ─────────────────────────── */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="bg-muted/40 px-5 py-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
                  Delivery Challan
                </p>
                <p className="font-mono text-base font-semibold">{challanNumber}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{orderDate}</p>
              </div>
              <OrderStatusBadge status={status} />
            </div>

            <Separator />

            {/* Deliver To + editable transport */}
            <div className="px-5 py-4 flex gap-3">
              <div className="mt-0.5 shrink-0 size-8 rounded-full bg-accent/20 flex items-center justify-center">
                <MapPinIcon className="size-4 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Deliver To
                </p>
                <p className="font-semibold text-sm">{order.dealer?.name ?? "—"}</p>
                {order.dealer?.territory && (
                  <p className="text-xs text-muted-foreground">{order.dealer.territory}</p>
                )}
                {order.dealer?.contact && (
                  <p className="text-xs text-muted-foreground">{order.dealer.contact}</p>
                )}

                {!isViewOnly && (
                  <div className="mt-3 space-y-1">
                    <Label htmlFor="transport" className="text-xs text-muted-foreground">
                      Transport
                    </Label>
                    <Input
                      id="transport"
                      value={transport}
                      onChange={(e) => setTransport(e.target.value)}
                      placeholder="Transport company name"
                      className="h-8 text-sm"
                    />
                  </div>
                )}
                {isViewOnly && challan?.transport_name && (
                  <p className="text-xs text-muted-foreground mt-1">
                    via {challan.transport_name}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Items */}
            <div className="px-5 py-4">
              <div className="flex gap-3 mb-3">
                <div className="mt-0.5 shrink-0 size-8 rounded-full bg-accent/20 flex items-center justify-center">
                  <PackageIcon className="size-4 text-accent-foreground" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-2">
                  Items
                </p>
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Seed</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground w-16">Unit</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground w-14">Qty</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Batch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(order.items ?? []).map((item, idx) => (
                      <tr
                        key={item.id}
                        className={idx < (order.items?.length ?? 0) - 1 ? "border-b border-border" : ""}
                      >
                        <td className="px-3 py-3">
                          <span className="font-medium">{item.seed?.crops?.name ?? "—"}</span>
                          {item.seed?.variety && (
                            <span className="text-muted-foreground text-xs block">
                              {item.seed.variety}
                              {item.seed.pack_size ? ` · ${item.seed.pack_size}` : ""}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right text-muted-foreground text-xs">{item.unit ?? "—"}</td>
                        <td className="px-3 py-3 text-right font-semibold">{item.quantity}</td>
                        <td className="px-3 py-3 text-xs font-mono text-muted-foreground">
                          {item.batch_number ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {Object.keys(unitTotals).length > 0 && (
                <div className="mt-2.5 flex items-center justify-end gap-4 border-t border-border pt-2.5">
                  <span className="text-xs text-muted-foreground">Total:</span>
                  {Object.entries(unitTotals).map(([unit, total]) => (
                    <span key={unit} className="text-xs font-semibold">
                      {total} {unit}{total !== 1 ? "s" : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {order.notes && (
              <>
                <Separator />
                <div className="px-5 py-4 flex gap-3">
                  <div className="mt-0.5 shrink-0 size-8 rounded-full bg-accent/20 flex items-center justify-center">
                    <FileTextIcon className="size-4 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                      Delivery Instructions
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Dispatch form card ─────────────────────────── */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <ClipboardListIcon className="size-4 text-muted-foreground" />
                <p className="font-semibold text-sm">
                  {isUpdating ? "Transport Dispatch" : "Dispatch Details"}
                </p>
              </div>
              {isUpdating && (
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the date the transport company collected the goods.
                </p>
              )}
            </div>

            <div className="px-5 py-5 space-y-4">
              {(isUpdating || isViewOnly) && challan && (
                <div className="rounded-lg bg-muted/40 border border-border p-4 space-y-2 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Challan Info
                  </p>
                  <InfoRow label="Challan No." value={challan.challan_number} mono />
                  <InfoRow
                    label="Godown Dispatched"
                    value={formatDateMedium(challan.godown_dispatch_date)}
                  />
                  {challan.transport_dispatch_date && (
                    <InfoRow
                      label="Transport Dispatched"
                      value={formatDateMedium(challan.transport_dispatch_date)}
                    />
                  )}
                  {challan.lr_number && (
                    <InfoRow label="LR Number" value={challan.lr_number} />
                  )}
                </div>
              )}

              {isCreating && (
                <FormField label="Challan Number" required>
                  <Input
                    value={challanNumber}
                    onChange={(e) => setChallanNumber(e.target.value)}
                    placeholder="e.g. DC-1001"
                    className="font-mono"
                  />
                </FormField>
              )}

              {isUpdating && (
                <>
                  <FormField label="LR Number">
                    <Input
                      value={lrNumber}
                      onChange={(e) => setLrNumber(e.target.value)}
                      placeholder="Lorry Receipt number"
                    />
                  </FormField>

                  <FormField label="Transport Dispatch Date" required>
                    <DatePicker
                      value={transportDate}
                      onChange={setTransportDate}
                      placeholder="Select date"
                      minDate={challan?.godown_dispatch_date}
                      className="w-full"
                    />
                  </FormField>
                </>
              )}

              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Sticky bottom action bar ────────────────────────── */}
      <div className="fixed bottom-0 left-0 md:left-[var(--sidebar-width)] right-0 z-10 bg-background/95 backdrop-blur border-t border-border py-3 safe-bottom">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-end gap-3">
          {isCreating && (
            <Button
              size="default"
              className="bg-blue-600 text-white hover:bg-blue-700 border-0 w-full sm:w-auto sm:min-w-52"
              onClick={handleGodownDispatch}
              disabled={saving}
            >
              {saving ? "Saving…" : <><TruckIcon className="size-4" />Mark Godown Dispatched</>}
            </Button>
          )}

          {isUpdating && (
            <Button
              size="default"
              className="bg-purple-600 text-white hover:bg-purple-700 border-0 w-full sm:w-auto sm:min-w-52"
              onClick={handleTransportDispatch}
              disabled={saving}
            >
              {saving ? "Saving…" : <><CheckCircle2Icon className="size-4" />Mark Transport Dispatched</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helper components ──────────────────────────────────────────

function PageHeader({ onBack, orderNumber }: { onBack: () => void; orderNumber: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 bg-background">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 gap-1.5 text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" />
        Orders
      </Button>
      <Separator orientation="vertical" className="h-4" />
      <nav className="flex items-center gap-1.5 text-sm min-w-0">
        <span className="text-muted-foreground truncate hidden sm:block">Orders</span>
        <span className="text-muted-foreground hidden sm:block">/</span>
        <span className="font-mono text-xs text-muted-foreground truncate hidden sm:block">{orderNumber}</span>
        <span className="text-muted-foreground hidden sm:block">/</span>
        <span className="font-medium truncate">Challan</span>
      </nav>
    </header>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`font-medium truncate ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
