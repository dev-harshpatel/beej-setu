import type { PaymentMode } from "@/types/database.types";

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  CASH:          "Cash",
  BANK_TRANSFER: "Bank Transfer",
  UPI:           "UPI",
  CHEQUE:        "Cheque",
};

export const PAYMENT_MODE_OPTIONS: { value: PaymentMode; label: string }[] = (
  Object.entries(PAYMENT_MODE_LABELS) as [PaymentMode, string][]
).map(([value, label]) => ({ value, label }));
