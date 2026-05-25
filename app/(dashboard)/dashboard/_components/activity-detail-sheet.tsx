"use client";

import { XIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActivityItem } from "./activity-feed";

interface Props {
  item: ActivityItem | null;
  open: boolean;
  onClose: () => void;
}

const TYPE_CONFIG: Record<
  ActivityItem["type"],
  { label: string; dotClass: string; bgClass: string }
> = {
  order:    { label: "Order",    dotClass: "bg-foreground",       bgClass: "bg-foreground/8" },
  approval: { label: "Approval", dotClass: "bg-warning",          bgClass: "bg-warning/10" },
  user:     { label: "User",     dotClass: "bg-accent-foreground", bgClass: "bg-accent/15" },
  return:   { label: "Return",   dotClass: "bg-destructive",       bgClass: "bg-destructive/10" },
  dealer:   { label: "Dealer",   dotClass: "bg-muted-foreground",  bgClass: "bg-muted" },
};

export function ActivityDetailSheet({ item, open, onClose }: Props) {
  if (!item) return null;

  const cfg = TYPE_CONFIG[item.type];

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[60vh] flex flex-col p-0 sm:max-w-lg sm:mx-auto sm:left-1/2 sm:-translate-x-1/2"
        showCloseButton={false}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Header */}
        <SheetHeader className="shrink-0 flex flex-row items-center justify-between px-5 pb-3 pt-1 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "size-2.5 rounded-full shrink-0",
                cfg.dotClass
              )}
            />
            <SheetTitle className="text-sm font-semibold">
              Activity Detail
            </SheetTitle>
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full",
                cfg.bgClass
              )}
            >
              {cfg.label}
            </span>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} className="shrink-0">
            <XIcon className="size-4" />
          </Button>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4 min-h-0">
          {/* Activity description */}
          <div
            className={cn(
              "rounded-xl p-4 flex items-start gap-3",
              cfg.bgClass
            )}
          >
            <div
              className={cn(
                "mt-0.5 size-3 shrink-0 rounded-full",
                cfg.dotClass
              )}
            />
            <p className="text-sm leading-relaxed">
              <span className="font-semibold">{item.actor}</span>{" "}
              <span className="text-muted-foreground">{item.action}</span>
              {item.target && (
                <>
                  {" "}
                  <span className="font-semibold">{item.target}</span>
                </>
              )}
            </p>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Actor</p>
              <p className="font-medium">{item.actor}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Type</p>
              <p className="font-medium capitalize">{item.type}</p>
            </div>
            {item.target && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Target</p>
                <p className="font-medium">{item.target}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">When</p>
              <p className="font-medium">{item.time}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border bg-card px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <Button
            variant="outline"
            className="w-full h-11"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
