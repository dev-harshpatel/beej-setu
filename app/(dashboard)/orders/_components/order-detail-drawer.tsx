"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClipboardListIcon,
  ClockIcon,
  PackageIcon,
  PauseCircleIcon,
  PencilIcon,
  UserIcon,
  XCircleIcon,
  XIcon,
} from "lucide-react";
import type { SeedAvailability } from "@/app/api/stock/availability/route";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldLabel,
} from "@/components/ui/field";
import { OrderStatusBadge } from "./order-status-badge";
import { PartialApprovalReasonModal, type PartialReason } from "./partial-approval-reason-modal";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ADMIN_SETTABLE_STATUSES,
  CHALLAN_ELIGIBLE_STATUSES,
  type OrderStatusValue,
} from "@/constants/order-status.constants";
import { ROUTES } from "@/constants/routes.constants";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/constants/roles.constants";
import type { OrderWithRelations } from "@/types/order.types";

const STOCK_IMPACT_STATUSES: OrderStatusValue[] = [
  ORDER_STATUSES.APPROVED,
  ORDER_STATUSES.PARTIALLY_APPROVED,
  ORDER_STATUSES.GODOWN_DISPATCHED,
  ORDER_STATUSES.TRANSPORT_DISPATCHED,
  ORDER_STATUSES.SHIPPED,
];

interface EditFields {
  notes: string;
  delivery_date: string;
}

type OrderUnit = "Bag" | "Packet" | "Box";
type ItemEdit = { quantity: number; unit: OrderUnit };

// ── Stock Summary Panel ───────────────────────────────────────────────────────

function StockSummaryPanel({ order }: { order: OrderWithRelations }) {
  const seedIds = (order.items ?? [])
    .map((i) => i.seed_id)
    .filter((id): id is string => !!id);

  const { data: availability, isLoading } = useQuery<SeedAvailability[]>({
    queryKey: ["stock-availability", seedIds],
    queryFn: async () => {
      const res = await fetch(`/api/stock/availability?seedIds=${seedIds.join(",")}`);
      const json = await res.json();
      if (!json.success) throw new Error("Failed to fetch stock");
      return json.data as SeedAvailability[];
    },
    enabled: seedIds.length > 0,
    staleTime: 30_000,
  });

  const stockMap = Object.fromEntries((availability ?? []).map((s) => [s.seed_id, s]));

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
      <div className="flex items-center gap-2 border-b border-amber-200 dark:border-amber-900 px-3 py-2">
        <PackageIcon className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
          Stock Availability Preview
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
          <span className="size-3 animate-spin rounded-full border border-muted-foreground border-t-transparent" />
          Checking stock…
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-amber-100 dark:divide-amber-900/60">
          {(order.items ?? []).map((item) => {
            const stock = item.seed_id ? stockMap[item.seed_id] : undefined;
            const unit = (item.unit ?? "Bag") as "Bag" | "Packet";
            const ppb = stock?.packets_per_bag ?? 1;

            // Convert order qty to bags & packets for display
            const orderBags = unit === "Bag" ? item.quantity : 0;
            const orderPackets = unit === "Packet" ? item.quantity : 0;

            const availBags = stock?.bag_stock ?? 0;
            const availPackets = stock?.packet_stock ?? 0;

            // Total in packets for comparison
            const availTotal = availBags * ppb + availPackets;
            const orderTotal = orderBags * ppb + orderPackets;
            const afterTotal = availTotal - orderTotal;

            const sufficient = afterTotal >= 0;

            const afterBags = sufficient ? Math.floor(afterTotal / ppb) : Math.floor(Math.abs(afterTotal) / ppb);
            const afterPkts = sufficient ? afterTotal % ppb : Math.abs(afterTotal) % ppb;

            const seedName = item.seed?.crops?.name ?? "—";
            const variety = item.seed?.variety ?? "";

            return (
              <div key={item.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-3 py-2.5 text-xs">
                {/* Seed name */}
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{seedName}</p>
                  {variety && <p className="text-muted-foreground truncate">{variety}</p>}
                </div>

                {/* Available */}
                <div className="text-right">
                  <p className="text-muted-foreground leading-tight">Available</p>
                  {stock ? (
                    <p className="font-semibold tabular-nums text-foreground">
                      {availBags > 0 && <span>{availBags} bag{availBags !== 1 ? "s" : ""}</span>}
                      {availBags > 0 && availPackets > 0 && <span className="text-muted-foreground"> + </span>}
                      {availPackets > 0 && <span>{availPackets} pkt{availPackets !== 1 ? "s" : ""}</span>}
                      {availBags === 0 && availPackets === 0 && <span className="text-destructive">0</span>}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">—</p>
                  )}
                </div>

                {/* Arrow */}
                <ArrowRightIcon className="size-3 text-muted-foreground shrink-0" />

                {/* After approval */}
                <div className="text-right min-w-[5rem]">
                  <p className="text-muted-foreground leading-tight">After</p>
                  {stock ? (
                    <p className={`font-semibold tabular-nums flex items-center justify-end gap-1 ${sufficient ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                      {!sufficient && <AlertTriangleIcon className="size-3 shrink-0" />}
                      {sufficient ? (
                        <>
                          {afterBags > 0 && <span>{afterBags} bag{afterBags !== 1 ? "s" : ""}</span>}
                          {afterBags > 0 && afterPkts > 0 && <span className="text-muted-foreground">+</span>}
                          {afterPkts > 0 && <span>{afterPkts} pkt{afterPkts !== 1 ? "s" : ""}</span>}
                          {afterTotal === 0 && <span>0</span>}
                        </>
                      ) : (
                        <span>Short {afterBags > 0 ? `${afterBags}bg` : ""}{afterPkts > 0 ? ` ${afterPkts}pk` : ""}</span>
                      )}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">—</p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Order deduction summary row */}
          <div className="flex items-center justify-between px-3 py-2 bg-amber-100/60 dark:bg-amber-900/20">
            <span className="text-xs text-amber-700 dark:text-amber-400">
              Order deduction: {(order.items ?? []).map((i) => `${i.quantity} ${i.unit ?? "Bag"}`).join(", ")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface OrderDetailDrawerProps {
  order: OrderWithRelations | null;
  open: boolean;
  initialMode?: "view" | "edit";
  readOnly?: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: OrderStatusValue, partialReason?: PartialReason) => Promise<void>;
  onUpdate: (id: string, fields: Partial<EditFields>, itemEdits?: Record<string, ItemEdit>) => Promise<void>;
  onApprove?: (order: OrderWithRelations) => void;
  onCreateChallan: (order: OrderWithRelations) => void;
  onRefresh: () => void;
}

export function OrderDetailDrawer({
  order,
  open,
  initialMode = "view",
  readOnly = false,
  onClose,
  onStatusChange,
  onUpdate,
  onApprove,
  onCreateChallan,
  onRefresh,
}: OrderDetailDrawerProps) {
  const [mode, setMode] = useState<"view" | "edit">(initialMode);
  const { hasPermission } = usePermissions();
  const canViewLedger    = hasPermission(PERMISSIONS.STOCK_MANAGE);
  const canEdit          = hasPermission(PERMISSIONS.ORDERS_EDIT);

  const [editFields, setEditFields] = useState<EditFields>({ notes: "", delivery_date: "" });
  const [itemEdits, setItemEdits] = useState<Record<string, ItemEdit>>({});
  const [pendingStatus, setPendingStatus] = useState<OrderStatusValue | "">("");
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Partial approval reason modal
  const [reasonModalOpen, setReasonModalOpen] = useState(false);

  // Fulfill remaining
  const [fulfilling, setFulfilling] = useState(false);

  // Quick action buttons (Approve / Hold / Cancel) in view mode
  const [actionPending, setActionPending] = useState(false);

  async function handleQuickAction(status: OrderStatusValue) {
    if (!order || actionPending) return;
    setActionPending(true);
    setSaveError(null);
    try {
      await onStatusChange(order.id, status);
      onRefresh();
    } catch (err: unknown) {
      setSaveError((err as Error)?.message ?? "Action failed.");
    } finally {
      setActionPending(false);
    }
  }

  function handleOpenEdit() {
    if (!order) return;
    setEditFields({
      notes: order.notes ?? "",
      delivery_date: order.delivery_date ? order.delivery_date.split("T")[0] : "",
    });
    const edits: Record<string, ItemEdit> = {};
    (order.items ?? []).forEach((item) => {
      edits[item.id] = { quantity: item.quantity, unit: (item.unit ?? "Bag") as OrderUnit };
    });
    setItemEdits(edits);
    setMode("edit");
  }

  function handleCancelEdit() {
    setMode("view");
    setSaveError(null);
  }

  // Returns true if any item quantity was reduced from the original
  function hasReducedQuantities(): boolean {
    if (!order) return false;
    return (order.items ?? []).some((item) => {
      const edited = itemEdits[item.id];
      return edited !== undefined && edited.quantity < item.quantity;
    });
  }

  async function handleSave() {
    if (!order) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onUpdate(
        order.id,
        { notes: editFields.notes || undefined, delivery_date: editFields.delivery_date || undefined },
        itemEdits,
      );
      setMode("view");
      onRefresh();
    } catch {
      setSaveError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Saves edits then opens the batch-selection confirm modal (or approves directly if no modal).
  async function handleSaveAndApprove() {
    if (!order) return;
    if (hasReducedQuantities()) {
      setReasonModalOpen(true);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await onUpdate(
        order.id,
        { notes: editFields.notes || undefined, delivery_date: editFields.delivery_date || undefined },
        itemEdits,
      );
      setMode("view");
      if (onApprove) {
        onApprove(order);
      } else {
        await onStatusChange(order.id, ORDER_STATUSES.APPROVED);
        onRefresh();
      }
    } catch {
      setSaveError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Called after admin picks a reason in the partial-approval modal.
  async function handleApproveWithReason(reason: PartialReason) {
    if (!order) return;
    setReasonModalOpen(false);
    setSaving(true);
    setSaveError(null);
    try {
      await onUpdate(
        order.id,
        { notes: editFields.notes || undefined, delivery_date: editFields.delivery_date || undefined },
        itemEdits,
      );
      await onStatusChange(order.id, ORDER_STATUSES.PARTIALLY_APPROVED, reason);
      setMode("view");
      onRefresh();
    } catch {
      setSaveError("Failed to partially approve order. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFulfillRemaining() {
    if (!order) return;
    setFulfilling(true);
    setSaveError(null);
    try {
      const res  = await fetch(`/api/orders/${order.id}/fulfill-remaining`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message ?? "Failed to fulfill remaining");
      onRefresh();
    } catch (err: unknown) {
      setSaveError((err as Error)?.message ?? "Failed to fulfill remaining quantities.");
    } finally {
      setFulfilling(false);
    }
  }

  async function handleStatusSave() {
    if (!order || !pendingStatus) return;
    setStatusSaving(true);
    setSaveError(null);
    try {
      await onStatusChange(order.id, pendingStatus as OrderStatusValue);
      setPendingStatus("");
      onRefresh();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? (err instanceof Error ? err.message : null);
      setSaveError(msg ?? "Failed to update status.");
    } finally {
      setStatusSaving(false);
    }
  }

  function handleClose() {
    setMode("view");
    setPendingStatus("");
    setSaveError(null);
    onClose();
  }

  if (!order) return null;

  const totalItems = order.items?.length ?? 0;
  const canCreateChallan = CHALLAN_ELIGIBLE_STATUSES.includes(order.status as OrderStatusValue);

  const backorderItems = (order.items ?? []).filter(
    (i) => (i.requested_quantity ?? i.quantity) > i.quantity
  );
  const showBackorderPanel =
    order.status === ORDER_STATUSES.PARTIALLY_APPROVED &&
    order.partial_reason === "backorder" &&
    mode === "view" &&
    backorderItems.length > 0;

  return (
    <>
    <Sheet open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl lg:max-w-4xl overflow-y-auto p-0"
        showCloseButton={false}
      >
        {/* Header */}
        <SheetHeader className="flex flex-row items-center justify-between border-b px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            {mode === "edit" ? (
              <SheetTitle className="text-sm font-semibold truncate">
                Edit Order
              </SheetTitle>
            ) : (
              <>
                <SheetTitle className="sr-only">{order.order_number}</SheetTitle>
                <OrderStatusBadge status={order.status as OrderStatusValue} />
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {!readOnly && mode === "view" && (
              <Button variant="outline" size="sm" onClick={handleOpenEdit}>
                <PencilIcon className="size-3.5" />
                Edit
              </Button>
            )}
            {!readOnly && canCreateChallan && mode === "view" && (
              <Button
                size="sm"
                className="bg-accent text-accent-foreground hover:bg-accent/80 border-0"
                onClick={() => onCreateChallan(order)}
              >
                <ClipboardListIcon className="size-3.5" />
                <span className="hidden sm:inline">Create Challan</span>
              </Button>
            )}
            <Button variant="ghost" size="icon-sm" onClick={handleClose}>
              <XIcon className="size-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 py-5 sm:px-6">

          {/* Summary grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Dealer</span>
              <span className="text-sm font-medium">{order.dealer?.name ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Staff</span>
              <span className="text-sm font-medium">{order.staff?.name ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Date</span>
              <span className="text-sm font-medium">
                {new Date(order.created_at).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Order Items ({totalItems})</h3>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Seed</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground w-32">Unit</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Qty</th>
                    {mode === "view" && STOCK_IMPACT_STATUSES.includes(order.status as OrderStatusValue) && (
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Batch</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(order.items ?? []).map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-medium">
                        <div>{item.seed?.crops?.name ?? "—"}</div>
                        {item.seed?.variety && (
                          <div className="text-xs text-muted-foreground">{item.seed.variety}</div>
                        )}
                        {canViewLedger && STOCK_IMPACT_STATUSES.includes(order.status as OrderStatusValue) && item.seed_id && (
                          <a
                            href={`${ROUTES.STOCK.LEDGER}?seedId=${item.seed_id}`}
                            className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
                          >
                            View batch movement →
                          </a>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground w-32">
                        {mode === "edit" ? (
                          <Select
                            value={itemEdits[item.id]?.unit ?? item.unit ?? "Bag"}
                            onValueChange={(v) =>
                              setItemEdits((prev) => ({
                                ...prev,
                                [item.id]: {
                                  quantity: prev[item.id]?.quantity ?? item.quantity,
                                  unit: v as OrderUnit,
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Bag">Bag</SelectItem>
                              <SelectItem value="Packet">Packet</SelectItem>
                              <SelectItem value="Box">Box</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="block text-right">{item.unit ?? item.seed?.pack_size ?? "—"}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">
                        {mode === "edit" ? (
                          <input
                            type="number"
                            min={0}
                            value={itemEdits[item.id]?.quantity ?? item.quantity}
                            onChange={(e) =>
                              setItemEdits((prev) => ({
                                ...prev,
                                [item.id]: {
                                  quantity: Number(e.target.value),
                                  unit: prev[item.id]?.unit ?? (item.unit ?? "Bag") as OrderUnit,
                                },
                              }))
                            }
                            className="w-16 rounded border border-input bg-transparent px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-ring focus:ring-1 focus:ring-ring/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                        ) : (
                          item.quantity
                        )}
                      </td>
                      {mode === "view" && STOCK_IMPACT_STATUSES.includes(order.status as OrderStatusValue) && (
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                          {item.batch_number ?? "—"}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stock availability preview — shown for pending orders in view mode */}
          {order.status === ORDER_STATUSES.PENDING && mode === "view" && !readOnly && (
            <StockSummaryPanel order={order} />
          )}

          {/* Pending Fulfillment panel — shown for backorder partial approvals */}
          {showBackorderPanel && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30">
              <div className="flex items-center gap-2 border-b border-orange-200 dark:border-orange-900 px-3 py-2">
                <ClockIcon className="size-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
                <span className="text-xs font-semibold text-orange-800 dark:text-orange-300">
                  Pending Backorder
                </span>
              </div>
              <div className="flex flex-col divide-y divide-orange-100 dark:divide-orange-900/60">
                {backorderItems.map((item) => {
                  const requested = item.requested_quantity ?? item.quantity;
                  const remaining = requested - item.quantity;
                  return (
                    <div key={item.id} className="grid grid-cols-4 items-center gap-2 px-3 py-2.5 text-xs">
                      <div className="col-span-1 min-w-0">
                        <p className="font-medium truncate">{item.seed?.crops?.name ?? "—"}</p>
                        {item.seed?.variety && (
                          <p className="text-muted-foreground truncate">{item.seed.variety}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground leading-tight">Requested</p>
                        <p className="font-semibold tabular-nums">{requested} {item.unit}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground leading-tight">Supplied</p>
                        <p className="font-semibold tabular-nums">{item.quantity} {item.unit}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground leading-tight">Remaining</p>
                        <p className="font-semibold tabular-nums text-orange-600 dark:text-orange-400">
                          {remaining} {item.unit}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {canEdit && !readOnly && (
                <div className="border-t border-orange-200 dark:border-orange-900 px-3 py-2.5 flex flex-col gap-1.5">
                  {saveError && fulfilling && (
                    <p className="text-xs text-destructive">{saveError}</p>
                  )}
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="bg-success text-success-foreground hover:bg-success/90"
                      disabled={fulfilling}
                      onClick={handleFulfillRemaining}
                    >
                      <CheckCircleIcon className="size-3.5" />
                      {fulfilling ? "Fulfilling…" : "Fulfill Remaining"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Editable fields */}
          {mode === "edit" ? (
            <div className="flex flex-col gap-3 rounded-md border border-border p-3">
              <h3 className="text-sm font-semibold">Edit Order</h3>

              <Field>
                <FieldLabel htmlFor="od-notes">Notes</FieldLabel>
                <textarea
                  id="od-notes"
                  rows={3}
                  value={editFields.notes}
                  onChange={(e) => setEditFields((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                  placeholder="Add notes…"
                />
              </Field>

              {saveError && <p className="text-sm text-destructive">{saveError}</p>}

              <div className="flex flex-wrap gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={saving}>
                  Cancel
                </Button>
                <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "Save Only"}
                </Button>
                {(order.status === ORDER_STATUSES.PENDING || order.status === ORDER_STATUSES.HOLD) && (
                  <Button
                    size="sm"
                    onClick={handleSaveAndApprove}
                    disabled={saving}
                    className="bg-success text-success-foreground hover:bg-success/90"
                  >
                    <CheckCircleIcon className="size-3.5" />
                    {saving ? "Approving…" : "Save & Approve"}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {order.notes && (
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{order.notes}</p>
                </div>
              )}
              {order.delivery_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarIcon className="size-3.5 shrink-0" />
                  <span>
                    Delivery:{" "}
                    {new Date(order.delivery_date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Quick actions */}
          {!readOnly && (order.status === ORDER_STATUSES.PENDING || order.status === ORDER_STATUSES.HOLD) && mode === "view" && (
            <>
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">Actions</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="bg-success text-success-foreground hover:bg-success/90"
                    disabled={actionPending}
                    onClick={() => {
                      if (onApprove) onApprove(order);
                      else handleQuickAction(ORDER_STATUSES.APPROVED);
                    }}
                  >
                    <CheckCircleIcon className="size-3.5" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionPending}
                    onClick={() => handleQuickAction(ORDER_STATUSES.HOLD)}
                  >
                    <PauseCircleIcon className="size-3.5" />
                    Hold
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    disabled={actionPending}
                    onClick={() => handleQuickAction(ORDER_STATUSES.CANCELLED)}
                  >
                    <XCircleIcon className="size-3.5" />
                    Cancel Order
                  </Button>
                </div>
                {saveError && actionPending === false && (
                  <p className="text-sm text-destructive">{saveError}</p>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Change status */}
          {!readOnly && (
            <>
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">Change Status</h3>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Select
                    value={pendingStatus}
                    onValueChange={(v) => setPendingStatus(v as OrderStatusValue)}
                  >
                    <SelectTrigger className="w-full sm:w-56">
                      <SelectValue
                        placeholder={`Current: ${ORDER_STATUS_LABELS[order.status as OrderStatusValue] ?? order.status}`}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {ADMIN_SETTABLE_STATUSES.filter((s) => s !== order.status).map((s) => (
                        <SelectItem key={s} value={s}>
                          {ORDER_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    disabled={!pendingStatus || statusSaving}
                    onClick={handleStatusSave}
                  >
                    <CheckCircleIcon className="size-3.5" />
                    {statusSaving ? "Updating…" : "Update Status"}
                  </Button>
                </div>
                {saveError && !saving && (
                  <p className="text-sm text-destructive">{saveError}</p>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* History */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">History</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent">
                  <UserIcon className="size-3 text-accent-foreground" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium">Order Created</p>
                  <p className="text-xs text-muted-foreground">
                    by {order.staff?.name ?? "Unknown"} ·{" "}
                    {new Date(order.created_at).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              {order.updated_at !== order.created_at && (
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
                    <ClockIcon className="size-3 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium">Last Modified</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.updated_at).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>

    <PartialApprovalReasonModal
      open={reasonModalOpen}
      saving={saving}
      items={(order.items ?? [])
        .filter((item) => {
          const edited = itemEdits[item.id];
          return edited !== undefined && edited.quantity < item.quantity;
        })
        .map((item) => ({
          itemId:      item.id,
          seedName:    item.seed?.crops?.name ?? "—",
          variety:     item.seed?.variety ?? "",
          unit:        itemEdits[item.id]?.unit ?? item.unit ?? "Bag",
          requestedQty: item.requested_quantity ?? item.quantity,
          approvedQty:  itemEdits[item.id]?.quantity ?? item.quantity,
        }))}
      onConfirm={handleApproveWithReason}
      onCancel={() => setReasonModalOpen(false)}
    />
    </>
  );
}
