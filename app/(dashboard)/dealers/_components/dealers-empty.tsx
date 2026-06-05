import { StoreIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

interface DealersEmptyProps {
  hasFilters: boolean;
  canCreate: boolean;
  onAdd: () => void;
  onReset?: () => void;
}

export function DealersEmpty({ hasFilters, canCreate, onAdd, onReset }: DealersEmptyProps) {
  const action = hasFilters && onReset
    ? { label: "Reset Filters", onClick: onReset }
    : !hasFilters && canCreate
      ? { label: "Add first dealer", onClick: onAdd }
      : undefined;

  return (
    <EmptyState
      icon={StoreIcon}
      title={hasFilters ? "No dealers match your filters" : "No dealers added yet"}
      description={hasFilters ? "Try adjusting your search or filters." : undefined}
      action={action}
    />
  );
}
