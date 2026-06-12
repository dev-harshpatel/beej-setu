import type { DealerStatusValue } from "@/constants/dealer-status.constants";

export const STATUS_DOT: Record<DealerStatusValue, string> = {
  ACTIVE:     "bg-success",
  SUSPENDED:  "bg-warning",
  TERMINATED: "bg-destructive",
};
