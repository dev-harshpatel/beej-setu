import {
  ORDER_STATUSES,
  type OrderStatusValue,
} from "@/constants/order-status.constants";

// ── Admin tabs ────────────────────────────────────────────────
export type AdminTabValue =
  | "all"
  | "pending"
  | "approved"
  | "partially_approved"
  | "hold"
  | "dispatched";

export const ADMIN_TAB_STATUS: Record<AdminTabValue, OrderStatusValue | undefined> = {
  all:                undefined,
  pending:            ORDER_STATUSES.PENDING,
  approved:           ORDER_STATUSES.APPROVED,
  partially_approved: ORDER_STATUSES.PARTIALLY_APPROVED,
  hold:               ORDER_STATUSES.HOLD,
  dispatched:         ORDER_STATUSES.SHIPPED,
};

export const ADMIN_TABS: { value: AdminTabValue; label: string }[] = [
  { value: "all",                label: "All Orders" },
  { value: "pending",            label: "Pending" },
  { value: "approved",           label: "Approved" },
  { value: "partially_approved", label: "Partial" },
  { value: "hold",               label: "Hold" },
  { value: "dispatched",         label: "Dispatched" },
];

// ── Dispatch-staff tabs ───────────────────────────────────────
// Only orders that admin has confirmed — PENDING/HOLD/CANCELLED are hidden.
export type DispatchTabValue = "all" | "ready" | "godown" | "transport";

export const DISPATCH_VISIBLE_STATUSES: OrderStatusValue[] = [
  ORDER_STATUSES.APPROVED,
  ORDER_STATUSES.PARTIALLY_APPROVED,
  ORDER_STATUSES.GODOWN_DISPATCHED,
  ORDER_STATUSES.TRANSPORT_DISPATCHED,
  ORDER_STATUSES.SHIPPED,
];

export const DISPATCH_TAB_STATUS: Record<DispatchTabValue, OrderStatusValue | undefined> = {
  all:       undefined,
  ready:     ORDER_STATUSES.APPROVED,
  godown:    ORDER_STATUSES.GODOWN_DISPATCHED,
  transport: ORDER_STATUSES.TRANSPORT_DISPATCHED,
};

export const DISPATCH_TABS: { value: DispatchTabValue; label: string }[] = [
  { value: "all",       label: "All Orders" },
  { value: "ready",     label: "Pending" },
  { value: "godown",    label: "Godown Dispatch" },
  { value: "transport", label: "Transport Dispatch" },
];

export type TabValue = AdminTabValue | DispatchTabValue;
