"use client";

import { useState } from "react";
import {
  CalendarIcon,
  CheckCircleIcon,
  ClipboardListIcon,
  PencilIcon,
  PrinterIcon,
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
import { Field, FieldLabel } from "@/components/ui/field";
import { OrderStatusBadge } from "./order-status-badge";
import { PartialApprovalReasonModal, type PartialReason } from "./partial-approval-reason-modal";
import { OrderStockPanel } from "./drawer/order-stock-panel";
import { OrderBackorderPanel } from "./drawer/order-backorder-panel";
import { OrderItemsTable, type ItemEditState } from "./drawer/order-items-table";
import { OrderDrawerActions } from "./drawer/order-drawer-actions";
import { OrderDrawerHistory } from "./drawer/order-drawer-history";
import { ShareWhatsAppButton } from "@/components/shared/share-whatsapp-button";
import {
  ORDER_STATUSES,
  CHALLAN_ELIGIBLE_STATUSES,
  CHALLAN_VIEWABLE_STATUSES,
  type OrderStatusValue,
} from "@/constants/order-status.constants";
import { usePermissions } from "@/hooks/use-permissions";
import { formatDateMedium } from "@/lib/utils";
import { PERMISSIONS } from "@/constants/roles.constants";
import type { OrderWithRelations } from "@/types/order.types";
import { orderService } from "@/services/order.service";
import { buildOrderWhatsAppMessage, buildApprovalWhatsAppMessage } from "@/lib/whatsapp";

const ORDER_PLACED_STATUSES: OrderStatusValue[] = [ORDER_STATUSES.PENDING, ORDER_STATUSES.HOLD];
const ORDER_APPROVED_STATUSES: OrderStatusValue[] = [
  ORDER_STATUSES.APPROVED,
  ORDER_STATUSES.PARTIALLY_APPROVED,
  ORDER_STATUSES.GODOWN_DISPATCHED,
  ORDER_STATUSES.TRANSPORT_DISPATCHED,
  ORDER_STATUSES.SHIPPED,
];

type OrderUnit = "Bag" | "Packet" | "Box";
type ItemEdit = { quantity: number; unit: OrderUnit };

interface EditFields {
  notes: string;
  delivery_date: string;
}

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
  const [mode, setMode]               = useState<"view" | "edit">(initialMode);
  const { hasPermission }             = usePermissions();
  const canViewLedger                 = hasPermission(PERMISSIONS.STOCK_MANAGE);
  const canEdit                       = hasPermission(PERMISSIONS.ORDERS_EDIT);

  const [editFields, setEditFields]           = useState<EditFields>({ notes: "", delivery_date: "" });
  const [itemEdits, setItemEdits]             = useState<Record<string, ItemEditState>>({});
  const [pendingStatus, setPendingStatus]     = useState<OrderStatusValue | "">("");
  const [saving, setSaving]                   = useState(false);
  const [statusSaving, setStatusSaving]       = useState(false);
  const [saveError, setSaveError]             = useState<string | null>(null);
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [fulfilling, setFulfilling]           = useState(false);
  const [actionPending, setActionPending]     = useState(false);

  // ── Item edit helpers ─────────────────────────────────────
  function handleQuantityChange(itemId: string, value: number | "") {
    setItemEdits((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantity: value },
    }));
  }

  function handleUnitChange(itemId: string, unit: OrderUnit) {
    setItemEdits((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], unit },
    }));
  }

  function hasEmptyQuantities() {
    return Object.values(itemEdits).some((e) => e.quantity === "");
  }

  function hasReducedQuantities() {
    if (!order) return false;
    return (order.items ?? []).some((item) => {
      const e = itemEdits[item.id];
      return e !== undefined && e.quantity !== "" && e.quantity < item.quantity;
    });
  }

  // ── Mode helpers ──────────────────────────────────────────
  function handleOpenEdit() {
    if (!order) return;
    setEditFields({
      notes: order.notes ?? "",
      delivery_date: order.delivery_date ? order.delivery_date.split("T")[0] : "",
    });
    const edits: Record<string, ItemEditState> = {};
    (order.items ?? []).forEach((item) => {
      edits[item.id] = { quantity: item.quantity, unit: (item.unit ?? "Bag") as OrderUnit };
    });
    setItemEdits(edits);
    setMode("edit");
  }

  function handleCancelEdit() { setMode("view"); setSaveError(null); }

  function handleClose() {
    setMode("view"); setPendingStatus(""); setSaveError(null); onClose();
  }

  // ── Action handlers ───────────────────────────────────────
  async function handleQuickAction(status: OrderStatusValue) {
    if (!order || actionPending) return;
    setActionPending(true);
    setSaveError(null);
    try { await onStatusChange(order.id, status); onRefresh(); }
    catch (err: unknown) { setSaveError((err as Error)?.message ?? "Action failed."); }
    finally { setActionPending(false); }
  }

  async function handleSave() {
    if (!order) return;
    if (hasEmptyQuantities()) { setSaveError("All item quantities must be filled in."); return; }
    setSaving(true); setSaveError(null);
    try {
      await onUpdate(
        order.id,
        { notes: editFields.notes || undefined, delivery_date: editFields.delivery_date || undefined },
        itemEdits as Record<string, ItemEdit>,
      );
      setMode("view"); onRefresh();
    } catch { setSaveError("Failed to save changes. Please try again."); }
    finally { setSaving(false); }
  }

  async function handleSaveAndApprove() {
    if (!order) return;
    if (hasEmptyQuantities()) { setSaveError("All item quantities must be filled in."); return; }
    if (hasReducedQuantities()) { setReasonModalOpen(true); return; }
    setSaving(true); setSaveError(null);
    try {
      await onUpdate(
        order.id,
        { notes: editFields.notes || undefined, delivery_date: editFields.delivery_date || undefined },
        itemEdits as Record<string, ItemEdit>,
      );
      setMode("view");
      if (onApprove) onApprove(order);
      else { await onStatusChange(order.id, ORDER_STATUSES.APPROVED); onRefresh(); }
    } catch { setSaveError("Failed to save changes. Please try again."); }
    finally { setSaving(false); }
  }

  async function handleApproveWithReason(reason: PartialReason) {
    if (!order) return;
    setReasonModalOpen(false); setSaving(true); setSaveError(null);
    try {
      await onUpdate(
        order.id,
        { notes: editFields.notes || undefined, delivery_date: editFields.delivery_date || undefined },
        itemEdits as Record<string, ItemEdit>,
      );
      await onStatusChange(order.id, ORDER_STATUSES.PARTIALLY_APPROVED, reason);
      setMode("view"); onRefresh();
    } catch { setSaveError("Failed to partially approve order. Please try again."); }
    finally { setSaving(false); }
  }

  async function handleFulfillRemaining() {
    if (!order) return;
    setFulfilling(true); setSaveError(null);
    try {
      await orderService.fulfillRemaining(order.id);
      onRefresh();
    } catch (err: unknown) {
      setSaveError((err as Error)?.message ?? "Failed to fulfill remaining quantities.");
    } finally { setFulfilling(false); }
  }

  async function handleStatusSave() {
    if (!order || !pendingStatus) return;
    setStatusSaving(true); setSaveError(null);
    try {
      await onStatusChange(order.id, pendingStatus as OrderStatusValue);
      setPendingStatus(""); onRefresh();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? (err instanceof Error ? err.message : null);
      setSaveError(msg ?? "Failed to update status.");
    } finally { setStatusSaving(false); }
  }

  if (!order) return null;

  const canCreateChallan = CHALLAN_ELIGIBLE_STATUSES.includes(order.status as OrderStatusValue);
  const canViewChallan = CHALLAN_VIEWABLE_STATUSES.includes(order.status as OrderStatusValue);

  const status = order.status as OrderStatusValue;
  const shareItems = (order.items ?? []).map((item) => ({
    cropName:    item.seed?.crops?.name ?? "—",
    seedName:    item.seed?.variety ?? "—",
    unit:        item.unit,
    quantity:    item.quantity,
    batchNumber: item.batch_number ?? undefined,
  }));
  const shareMessage = !order.dealer
    ? null
    : ORDER_APPROVED_STATUSES.includes(status)
    ? buildApprovalWhatsAppMessage({
        orderNumber:   order.order_number,
        dealer:        order.dealer!,
        transportName: order.transport_name ?? undefined,
        notes:         order.notes ?? undefined,
        items:         shareItems,
      })
    : ORDER_PLACED_STATUSES.includes(status)
    ? buildOrderWhatsAppMessage({
        dealer:        order.dealer!,
        transportName: order.transport_name ?? undefined,
        notes:         order.notes ?? undefined,
        items:         shareItems,
      })
    : null;

  const backorderItems = (order.items ?? []).filter(
    (i) => (i.requested_quantity ?? i.quantity) > i.quantity,
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
                <SheetTitle className="text-sm font-semibold truncate">Edit Order</SheetTitle>
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
              {canViewChallan && mode === "view" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCreateChallan(order)}
                >
                  <PrinterIcon className="size-3.5" />
                  <span className="hidden sm:inline">View / Print Challan</span>
                </Button>
              )}
              {shareMessage && mode === "view" && (
                <ShareWhatsAppButton
                  message={shareMessage}
                  label="Share on WhatsApp"
                  dialogTitle="Share on WhatsApp"
                  panelSubtitle="Resend this order's WhatsApp message to your group."
                />
              )}
              <Button variant="ghost" size="icon-sm" onClick={handleClose}>
                <XIcon className="size-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="flex flex-col gap-5 px-4 py-5 sm:px-6">
            {/* Summary */}
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
                  {formatDateMedium(order.created_at)}
                </span>
              </div>
            </div>

            <Separator />

            {/* Items table */}
            <OrderItemsTable
              order={order}
              mode={mode}
              itemEdits={itemEdits}
              canViewLedger={canViewLedger}
              onQuantityChange={handleQuantityChange}
              onUnitChange={handleUnitChange}
            />

            {/* Stock preview — pending orders only */}
            {order.status === ORDER_STATUSES.PENDING && mode === "view" && !readOnly && (
              <OrderStockPanel order={order} />
            )}

            {/* Backorder panel */}
            {showBackorderPanel && (
              <OrderBackorderPanel
                backorderItems={backorderItems}
                canEdit={canEdit}
                readOnly={readOnly}
                fulfilling={fulfilling}
                saveError={saveError}
                onFulfill={handleFulfillRemaining}
              />
            )}

            {/* Edit form */}
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
                      {formatDateMedium(order.delivery_date)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Actions + Change Status */}
            <OrderDrawerActions
              order={order}
              readOnly={readOnly}
              mode={mode}
              actionPending={actionPending}
              saveError={saveError}
              saving={saving}
              onApprove={() => {
                if (onApprove) onApprove(order);
                else handleQuickAction(ORDER_STATUSES.APPROVED);
              }}
              onHold={() => handleQuickAction(ORDER_STATUSES.HOLD)}
              onCancel={() => handleQuickAction(ORDER_STATUSES.CANCELLED)}
              pendingStatus={pendingStatus}
              statusSaving={statusSaving}
              onPendingStatusChange={setPendingStatus}
              onStatusSave={handleStatusSave}
            />

            {/* History */}
            <OrderDrawerHistory order={order} />
          </div>
        </SheetContent>
      </Sheet>

      <PartialApprovalReasonModal
        open={reasonModalOpen}
        saving={saving}
        items={(order.items ?? [])
          .filter((item) => {
            const e = itemEdits[item.id];
            return e !== undefined && e.quantity !== "" && e.quantity < item.quantity;
          })
          .map((item) => ({
            itemId:       item.id,
            seedName:     item.seed?.crops?.name ?? "—",
            variety:      item.seed?.variety ?? "",
            unit:         itemEdits[item.id]?.unit ?? item.unit ?? "Bag",
            requestedQty: item.requested_quantity ?? item.quantity,
            approvedQty:  (itemEdits[item.id]?.quantity as number | undefined) ?? item.quantity,
          }))}
        onConfirm={handleApproveWithReason}
        onCancel={() => setReasonModalOpen(false)}
      />
    </>
  );
}
