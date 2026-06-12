"use client";

import { Badge } from "@/components/ui/badge";

export function UserStatusCell({ isActive }: { isActive: boolean }) {
  return (
    <Badge className={isActive ? "bg-accent text-accent-foreground border-0" : "bg-muted text-muted-foreground border-0"}>
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
}
