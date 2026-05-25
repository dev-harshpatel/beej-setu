"use client";

import {
  ShoppingCartIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
  PackageCheckIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReportSummary } from "@/lib/database/reports.queries";

interface CardDef {
  title: string;
  key: keyof ReportSummary;
  icon: React.ElementType;
  colorClass: string;
}

const CARDS: CardDef[] = [
  { title: "Total Orders",       key: "totalOrders",        icon: ShoppingCartIcon,  colorClass: "bg-accent text-accent-foreground" },
  { title: "Pending",            key: "pending",            icon: ClockIcon,         colorClass: "bg-warning/10 text-warning" },
  { title: "Approved",           key: "approved",           icon: CheckCircleIcon,   colorClass: "bg-success/10 text-success" },
  { title: "Partially Approved", key: "partiallyApproved",  icon: CheckCircleIcon,   colorClass: "bg-orange-100 text-orange-600" },
  { title: "Cancelled",          key: "cancelled",          icon: XCircleIcon,       colorClass: "bg-destructive/15 text-destructive" },
  { title: "Dispatched",         key: "godownDispatched",   icon: TruckIcon,         colorClass: "bg-blue-100 text-blue-700" },
  { title: "In Transit",         key: "transportDispatched",icon: TruckIcon,         colorClass: "bg-purple-100 text-purple-700" },
  { title: "Delivered",          key: "shipped",            icon: PackageCheckIcon,  colorClass: "bg-accent text-accent-foreground" },
];

interface ReportsSummaryCardsProps {
  summary: ReportSummary;
  loading: boolean;
}

export function ReportsSummaryCards({ summary, loading }: ReportsSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
      {CARDS.map(({ title, key, icon: Icon, colorClass }) => (
        <div
          key={key}
          className="rounded-xl border border-border bg-card p-3.5 flex flex-col gap-2.5"
        >
          <div className="flex items-center justify-between gap-1">
            <p className="text-xs font-medium text-muted-foreground leading-tight">{title}</p>
            <div className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
              <Icon className="size-3.5" />
            </div>
          </div>
          {loading ? (
            <>
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-2.5 w-16" />
            </>
          ) : (
            <p className="text-2xl font-bold text-foreground tabular-nums leading-none">
              {summary[key]}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
