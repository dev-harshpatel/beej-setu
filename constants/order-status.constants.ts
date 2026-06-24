// Single source of truth for order statuses.
// Add new statuses here — all other files import from this module.

export const ORDER_STATUSES = {
  PENDING:              "PENDING",
  APPROVED:             "APPROVED",
  PARTIALLY_APPROVED:   "PARTIALLY_APPROVED",
  HOLD:                 "HOLD",
  CANCELLED:            "CANCELLED",
  GODOWN_DISPATCHED:    "GODOWN_DISPATCHED",
  TRANSPORT_DISPATCHED: "TRANSPORT_DISPATCHED",
  SHIPPED:              "SHIPPED",
} as const;

export type OrderStatusValue = (typeof ORDER_STATUSES)[keyof typeof ORDER_STATUSES];

export const ORDER_STATUS_LABELS: Record<OrderStatusValue, string> = {
  PENDING:              "Pending",
  APPROVED:             "Approved",
  PARTIALLY_APPROVED:   "Partially Approved",
  HOLD:                 "Hold",
  CANCELLED:            "Cancelled",
  GODOWN_DISPATCHED:    "Godown Dispatched",
  TRANSPORT_DISPATCHED: "Transport Dispatched",
  SHIPPED:              "Delivered",
};

// Tailwind className applied to the status badge
export const ORDER_STATUS_BADGE_CLASSES: Record<OrderStatusValue, string> = {
  PENDING:              "bg-warning/10 text-warning border-0",
  APPROVED:             "bg-success/10 text-success border-0",
  PARTIALLY_APPROVED:   "bg-orange-100 text-orange-600 border-0",
  HOLD:                 "bg-info/10 text-info border-0",
  CANCELLED:            "bg-destructive/15 text-destructive border-0",
  GODOWN_DISPATCHED:    "bg-blue-100 text-blue-700 border-0",
  TRANSPORT_DISPATCHED: "bg-purple-100 text-purple-700 border-0",
  SHIPPED:              "bg-accent text-accent-foreground border-0",
};

// The statuses an admin can manually assign to an order via the generic dropdown.
// APPROVED and PARTIALLY_APPROVED are intentionally excluded — they trigger stock deduction
// and must go through the dedicated Approve button (which calls approve_order() DB function).
// Setting APPROVED via this dropdown on an ineligible order would throw a DB error.
export const ADMIN_SETTABLE_STATUSES: OrderStatusValue[] = [
  ORDER_STATUSES.HOLD,
  ORDER_STATUSES.CANCELLED,
  ORDER_STATUSES.SHIPPED,
];

// Statuses that allow a challan to be created (first dispatch from godown)
export const CHALLAN_ELIGIBLE_STATUSES: OrderStatusValue[] = [
  ORDER_STATUSES.APPROVED,
  ORDER_STATUSES.PARTIALLY_APPROVED,
];

// Statuses that allow updating transport dispatch date
export const TRANSPORT_UPDATE_ELIGIBLE_STATUSES: OrderStatusValue[] = [
  ORDER_STATUSES.GODOWN_DISPATCHED,
];

// Statuses for which a challan already exists and can be viewed/printed/reprinted
export const CHALLAN_VIEWABLE_STATUSES: OrderStatusValue[] = [
  ORDER_STATUSES.GODOWN_DISPATCHED,
  ORDER_STATUSES.TRANSPORT_DISPATCHED,
  ORDER_STATUSES.SHIPPED,
];
