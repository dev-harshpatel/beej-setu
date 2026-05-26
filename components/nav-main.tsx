"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { usePermissions } from "@/hooks/use-permissions";
import { useStoreHydrated } from "@/hooks/use-store-hydrated";
import { useDashboardStore } from "@/store/dashboard.store";
import { ROUTES } from "@/constants/routes.constants";
import type { NavItem } from "@/constants/navigation.constants";

function NavCollapsibleItem({ item, isActive, pathname }: { item: NavItem; isActive: boolean; pathname: string }) {
  const [open, setOpen] = useState(isActive);

  return (
    <SidebarMenuItem>
      <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible w-full">
        <CollapsibleTrigger render={<SidebarMenuButton isActive={isActive} tooltip={item.label} />}>
          <item.icon />
          <span className="flex-1">{item.label}</span>
          <ChevronRightIcon className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children!.map((child) => {
              const childActive = pathname === child.href;
              return (
                <SidebarMenuSubItem key={child.label}>
                  <SidebarMenuSubButton
                    render={<Link href={child.href} />}
                    isActive={childActive}
                  >
                    {child.icon && <child.icon className="size-3.5" />}
                    <span>{child.label}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const { hasPermission } = usePermissions();
  const hydrated = useStoreHydrated();
  const pendingOrdersCount = useDashboardStore((s) => s.pendingOrdersCount);

  const visibleItems = items.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  if (!hydrated) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
        <SidebarMenu>
          {[1, 2, 3, 4].map((i) => (
            <SidebarMenuItem key={i}>
              <div className="mx-2 my-0.5 h-8 animate-pulse rounded-md bg-muted" />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      <SidebarMenu>
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const isOrders = item.href === ROUTES.ORDERS.ROOT;
          const badgeCount = isOrders ? pendingOrdersCount : 0;

          if (item.children?.length) {
            const visibleChildren = item.children.filter(
              (child) => !child.permission || hasPermission(child.permission)
            );
            return (
              <NavCollapsibleItem
                key={item.label}
                item={{ ...item, children: visibleChildren }}
                isActive={isActive}
                pathname={pathname}
              />
            );
          }

          return (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                render={<Link href={item.href} />}
                isActive={isActive}
                tooltip={item.label}
              >
                <item.icon />
                <span className="flex-1">{item.label}</span>
                {badgeCount > 0 && (
                  <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-warning text-[10px] font-semibold text-white leading-none">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
