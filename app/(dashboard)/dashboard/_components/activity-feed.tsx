import { cn } from "@/lib/utils";

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  time: string;
  type: "order" | "approval" | "user" | "return" | "dealer";
}

interface ActivityFeedProps {
  items: ActivityItem[];
  onItemClick?: (item: ActivityItem) => void;
}

const TYPE_DOT: Record<ActivityItem["type"], string> = {
  order: "bg-foreground",
  approval: "bg-warning",
  user: "bg-accent-foreground",
  return: "bg-destructive",
  dealer: "bg-muted-foreground",
};

export function ActivityFeed({ items, onItemClick }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        No recent activity
      </div>
    );
  }

  return (
    <div className="relative flex flex-col">
      {/* vertical line */}
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "relative flex gap-4 pb-5 last:pb-0 rounded-lg -mx-2 px-2 transition-colors",
            onItemClick && "cursor-pointer hover:bg-muted/50 active:bg-muted/80"
          )}
          onClick={() => onItemClick?.(item)}
        >
          {/* dot */}
          <div
            className={cn(
              "relative z-10 mt-1 size-3.5 shrink-0 rounded-full border-2 border-background",
              TYPE_DOT[item.type]
            )}
          />
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <p className="text-sm text-foreground leading-snug">
              <span className="font-medium">{item.actor}</span>{" "}
              <span className="text-muted-foreground">{item.action}</span>{" "}
              {item.target && <span className="font-medium">{item.target}</span>}
            </p>
            <p className="text-xs text-muted-foreground">{item.time}</p>
          </div>
          {onItemClick && (
            <div className="shrink-0 self-center text-muted-foreground/40">
              <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
