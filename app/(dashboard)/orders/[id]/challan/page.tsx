"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  MapPinIcon,
  PackageIcon,
  TruckIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Separator } from "@/components/ui/separator";
import { OrderStatusBadge } from "../../_components/order-status-badge";
import {
  ORDER_STATUSES,
  CHALLAN_ELIGIBLE_STATUSES,
  TRANSPORT_UPDATE_ELIGIBLE_STATUSES,
} from "@/constants/order-status.constants";
import { ROUTES } from "@/constants/routes.constants";
import type { OrderWithRelations } from "@/types/order.types";
import type { ChallanRow } from "@/types/database.types";
import type { OrderStatusValue } from "@/constants/order-status.constants";

export default function ChallanPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<OrderWithRelations | null>(null);
  const [challan, setChallan] = useState<ChallanRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [transport, setTransport] = useState("");
  const [challanNumber, setChallanNumber] = useState("");
  const [lrNumber, setLrNumber] = useState("");
  const [godownDate, setGodownDate] = useState("");
  const [transportDate, setTransportDate] = useState("");

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then(async (json) => {
        if (!json.success) { setError("Order not found."); return; }
        const o = json.data as OrderWithRelations;
        setOrder(o);
        setTransport(o.dealer?.default_transport ?? "");
        setChallanNumber(`DC-${o.order_number}`);

        // If already godown-dispatched or beyond, fetch the existing challan
        if (([
          ORDER_STATUSES.GODOWN_DISPATCHED,
          ORDER_STATUSES.TRANSPORT_DISPATCHED,
          ORDER_STATUSES.SHIPPED,
        ] as OrderStatusValue[]).includes(o.status)) {
          const cr = await fetch(`/api/challans/${o.id}`).then((r) => r.json()).catch(() => null);
          if (cr?.success && cr.data) {
            const c = cr.data as ChallanRow;
            setChallan(c);
            setTransport(c.transport_name ?? "");
            setChallanNumber(c.challan_number);
            setLrNumber(c.lr_number ?? "");
            setGodownDate(c.godown_dispatch_date);
          }
        }
      })
      .catch(() => setError("Failed to load order."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
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
          {error ?? "Order not found."}
        </div>
      </div>
    );
  }

  const status = order.status as OrderStatusValue;
  const isCreating = CHALLAN_ELIGIBLE_STATUSES.includes(status);
  const isUpdating = TRANSPORT_UPDATE_ELIGIBLE_STATUSES.includes(status);
  const isViewOnly = !isCreating && !isUpdating;

  async function handleGodownDispatch() {
    if (!order) return;
    if (!challanNumber.trim()) { setFormError("Challan number is required."); return; }
    setSaving(true); setFormError(null);
    try {
      const res = await fetch("/api/challans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.id,
          challan_number: challanNumber.trim(),
          transport_name: transport.trim() || null,
          lr_number: lrNumber.trim() || null,
          godown_dispatch_date: godownDate,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setFormError(json.message ?? "Failed to save challan."); return; }
      router.push(ROUTES.ORDERS.ROOT);
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTransportDispatch() {
    if (!order) return;
    if (!transportDate) { setFormError("Transport dispatch date is required."); return; }
    setSaving(true); setFormError(null);
    try {
      const res = await fetch(`/api/challans/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transport_dispatch_date: transportDate }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setFormError(json.message ?? "Failed to update."); return; }
      router.push(ROUTES.ORDERS.ROOT);
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const orderDate = new Date(order.created_at).toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader onBack={() => router.back()} orderNumber={order.order_number} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 pb-32 pt-4 space-y-4">

          {/* ── Order summary card ─────────────────────────── */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            {/* Card top strip */}
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

            {/* Dealer */}
            <div className="px-5 py-4 flex gap-3">
              <div className="mt-0.5 shrink-0 size-8 rounded-full bg-accent/20 flex items-center justify-center">
                <MapPinIcon className="size-4 text-accent-foreground" />
              </div>
              <div>
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
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                        Seed
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground w-16">
                        Unit
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground w-14">
                        Qty
                      </th>
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
                        <td className="px-3 py-3 text-right text-muted-foreground text-xs">
                          {item.unit ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

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
              {/* Existing challan info (read-only) when updating transport or viewing */}
              {(isUpdating || isViewOnly) && challan && (
                <div className="rounded-lg bg-muted/40 border border-border p-4 space-y-2 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Challan Info
                  </p>
                  <InfoRow label="Challan No." value={challan.challan_number} mono />
                  {challan.transport_name && <InfoRow label="Transport" value={challan.transport_name} />}
                  {challan.lr_number && <InfoRow label="LR Number" value={challan.lr_number} />}
                  <InfoRow
                    label="Godown Dispatched"
                    value={new Date(challan.godown_dispatch_date).toLocaleDateString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  />
                  {challan.transport_dispatch_date && (
                    <InfoRow
                      label="Transport Dispatched"
                      value={new Date(challan.transport_dispatch_date).toLocaleDateString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    />
                  )}
                </div>
              )}

              {/* Create challan fields */}
              {isCreating && (
                <>
                  <FormField label="Challan Number" required>
                    <Input
                      value={challanNumber}
                      onChange={(e) => setChallanNumber(e.target.value)}
                      placeholder="e.g. DC-1001"
                      className="font-mono"
                    />
                  </FormField>

                  <FormField label="Transport Name">
                    <Input
                      value={transport}
                      onChange={(e) => setTransport(e.target.value)}
                      placeholder="Transport company name"
                    />
                  </FormField>

                  <FormField label="LR Number">
                    <Input
                      value={lrNumber}
                      onChange={(e) => setLrNumber(e.target.value)}
                      placeholder="Lorry Receipt number"
                    />
                  </FormField>

                  <FormField label="Godown Dispatch Date" required>
                    <DatePicker
                      value={godownDate}
                      onChange={setGodownDate}
                      placeholder="Pick dispatch date"
                      minDate={order?.created_at?.split("T")[0]}
                      className="w-full"
                    />
                  </FormField>
                </>
              )}

              {/* Transport date field */}
              {isUpdating && (
                <FormField label="Transport Dispatch Date" required>
                  <DatePicker
                    value={transportDate}
                    onChange={setTransportDate}
                    placeholder="Pick transport date"
                    minDate={godownDate || undefined}
                    className="w-full"
                  />
                </FormField>
              )}

              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Sticky bottom action bar ────────────────────── */}
      <div className="fixed bottom-0 left-0 md:left-[var(--sidebar-width)] right-0 z-10 bg-background/95 backdrop-blur border-t border-border py-3 safe-bottom">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-end gap-3">
          {isCreating && (
            <Button
              size="default"
              className="bg-blue-600 text-white hover:bg-blue-700 border-0 w-full sm:w-auto sm:min-w-52"
              onClick={handleGodownDispatch}
              disabled={saving}
            >
              {saving ? (
                "Saving…"
              ) : (
                <>
                  <TruckIcon className="size-4" />
                  Mark Godown Dispatched
                </>
              )}
            </Button>
          )}

          {isUpdating && (
            <Button
              size="default"
              className="bg-purple-600 text-white hover:bg-purple-700 border-0 w-full sm:w-auto sm:min-w-52"
              onClick={handleTransportDispatch}
              disabled={saving}
            >
              {saving ? (
                "Saving…"
              ) : (
                <>
                  <CheckCircle2Icon className="size-4" />
                  Mark Transport Dispatched
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Small helper components ────────────────────────────────────

function PageHeader({ onBack, orderNumber }: { onBack: () => void; orderNumber: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 bg-background">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 gap-1.5 text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" />
        Orders
      </Button>
      <Separator orientation="vertical" className="h-4" />
      <nav className="flex items-center gap-1.5 text-sm min-w-0">
        <span className="text-muted-foreground truncate hidden sm:block">
          Orders
        </span>
        <span className="text-muted-foreground hidden sm:block">/</span>
        <span className="font-mono text-xs text-muted-foreground truncate hidden sm:block">
          {orderNumber}
        </span>
        <span className="text-muted-foreground hidden sm:block">/</span>
        <span className="font-medium truncate">Challan</span>
      </nav>
    </header>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
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
