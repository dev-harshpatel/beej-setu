"use client";

import { useState } from "react";
import {
  CalendarIcon,
  CheckCircleIcon,
  ClipboardListIcon,
  ClockIcon,
  PauseCircleIcon,
  PencilIcon,
  UserIcon,
  XCircleIcon,
  XIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DatePicker } from "@/components/ui/date-picker";
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
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ADMIN_SETTABLE_STATUSES,
  CHALLAN_ELIGIBLE_STATUSES,
  type OrderStatusValue,
} from "@/constants/order-status.constants";
import { ROUTES } from "@/constants/routes.constants";
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

interface OrderDetailDrawerProps {
  order: OrderWithRelations | null;
  open: boolean;
  initialMode?: "view" | "edit";
  onClose: () => void;
  onStatusChange: (id: string, status: OrderStatusValue) => Promise<void>;
  onUpdate: (id: string, fields: Partial<EditFields>, itemEdits?: Record<string, ItemEdit>) => Promise<void>;
  onCreateChallan: (order: OrderWithRelations) => void;
  onRefresh: () => void;
}

export function OrderDetailDrawer({
  order,
  open,
  initialMode = "view",
  onClose,
  onStatusChange,
  onUpdate,
  onCreateChallan,
  onRefresh,
}: OrderDetailDrawerProps) {
  const [mode, setMode] = useState<"view" | "edit">(initialMode);
  const [editFields, setEditFields] = useState<EditFields>({ notes: "", delivery_date: "" });
  const [itemEdits, setItemEdits] = useState<Record<string, ItemEdit>>({});
  const [pendingStatus, setPendingStatus] = useState<OrderStatusValue | "">("");
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  // Saves edits then transitions to APPROVED or PARTIALLY_APPROVED based on quantity changes
  async function handleSaveAndApprove() {
    if (!order) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onUpdate(
        order.id,
        { notes: editFields.notes || undefined, delivery_date: editFields.delivery_date || undefined },
        itemEdits,
      );
      const newStatus = hasReducedQuantities()
        ? ORDER_STATUSES.PARTIALLY_APPROVED
        : ORDER_STATUSES.APPROVED;
      await onStatusChange(order.id, newStatus);
      setMode("view");
      onRefresh();
    } catch {
      setSaveError("Failed to approve order. Please try again.");
    } finally {
      setSaving(false);
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
    } catch {
      setSaveError("Failed to update status.");
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

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl lg:max-w-4xl overflow-y-auto p-0"
        showCloseButton={false}
      >
        {/* Header */}
        <SheetHeader className="flex flex-row items-center justify-between border-b px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <SheetTitle className="font-mono text-sm font-semibold truncate">
              {order.order_number}
            </SheetTitle>
            <OrderStatusBadge status={order.status as OrderStatusValue} />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {mode === "view" && (
              <Button variant="outline" size="sm" onClick={handleOpenEdit}>
                <PencilIcon className="size-3.5" />
                Edit
              </Button>
            )}
            {canCreateChallan && mode === "view" && (
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
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Unit</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Qty</th>
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
                        {STOCK_IMPACT_STATUSES.includes(order.status as OrderStatusValue) && item.seed_id && (
                          <a
                            href={`${ROUTES.STOCK.LEDGER}?seedId=${item.seed_id}`}
                            className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
                          >
                            View batch movement →
                          </a>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {mode === "edit" ? (
                          <select
                            value={itemEdits[item.id]?.unit ?? item.unit ?? "Bag"}
                            onChange={(e) =>
                              setItemEdits((prev) => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], unit: e.target.value as OrderUnit },
                              }))
                            }
                            className="rounded border border-input bg-background px-2 py-1 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
                          >
                            <option value="Bag">Bag</option>
                            <option value="Packet">Packet</option>
                            <option value="Box">Box</option>
                          </select>
                        ) : (
                          item.unit ?? item.seed?.pack_size ?? "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">
                        {mode === "edit" ? (
                          <input
                            type="number"
                            min={1}
                            value={itemEdits[item.id]?.quantity ?? item.quantity}
                            onChange={(e) =>
                              setItemEdits((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  quantity: Math.max(1, Number(e.target.value)),
                                },
                              }))
                            }
                            className="w-16 rounded border border-input bg-transparent px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
                          />
                        ) : (
                          item.quantity
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

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

              <Field>
                <FieldLabel>Delivery Date</FieldLabel>
                <DatePicker
                  value={editFields.delivery_date}
                  onChange={(v) => setEditFields((f) => ({ ...f, delivery_date: v }))}
                  placeholder="Pick delivery date"
                  className="w-full"
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
                {order.status === ORDER_STATUSES.PENDING && (
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
          {order.status === ORDER_STATUSES.PENDING && mode === "view" && (
            <>
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">Actions</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="bg-success text-success-foreground hover:bg-success/90"
                    onClick={() => onStatusChange(order.id, ORDER_STATUSES.APPROVED).then(onRefresh)}
                  >
                    <CheckCircleIcon className="size-3.5" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStatusChange(order.id, ORDER_STATUSES.HOLD).then(onRefresh)}
                  >
                    <PauseCircleIcon className="size-3.5" />
                    Hold
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onStatusChange(order.id, ORDER_STATUSES.CANCELLED).then(onRefresh)}
                  >
                    <XCircleIcon className="size-3.5" />
                    Cancel Order
                  </Button>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Change status */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Change Status</h3>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select
                value={pendingStatus || undefined}
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
  );
}
