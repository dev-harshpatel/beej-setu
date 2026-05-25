export const DEALER_STATUSES = {
  ACTIVE:     "ACTIVE",
  SUSPENDED:  "SUSPENDED",
  TERMINATED: "TERMINATED",
} as const;

export type DealerStatusValue = (typeof DEALER_STATUSES)[keyof typeof DEALER_STATUSES];

export const DEALER_STATUS_LABELS: Record<DealerStatusValue, string> = {
  ACTIVE:     "Active",
  SUSPENDED:  "Suspended",
  TERMINATED: "Terminated",
};

export const DEALER_STATUS_BADGE_CLASSES: Record<DealerStatusValue, string> = {
  ACTIVE:     "bg-accent text-accent-foreground",
  SUSPENDED:  "bg-destructive/10 text-destructive",
  TERMINATED: "bg-muted text-muted-foreground line-through",
};

/** Dealers that can receive new orders */
export const ORDER_ELIGIBLE_STATUSES: DealerStatusValue[] = [DEALER_STATUSES.ACTIVE];
