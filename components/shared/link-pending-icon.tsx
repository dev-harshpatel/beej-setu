"use client";

import { useLinkStatus } from "next/link";
import { Loader2Icon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Swaps to a spinner while the parent <Link> navigation is pending. */
export function LinkPendingIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  const { pending } = useLinkStatus();
  return pending ? (
    <Loader2Icon data-pending className={cn(className, "animate-spin")} />
  ) : (
    <Icon className={className} />
  );
}
