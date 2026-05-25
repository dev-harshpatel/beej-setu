import { DEALER_STATUS_LABELS, DEALER_STATUS_BADGE_CLASSES } from "@/constants/dealer-status.constants";
import type { DealerStatus } from "@/types/dealer.types";

export function DealerStatusBadge({ status }: { status: DealerStatus }) {
  const label     = DEALER_STATUS_LABELS[status]      ?? status;
  const className = DEALER_STATUS_BADGE_CLASSES[status] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
