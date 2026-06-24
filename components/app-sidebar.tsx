"use client";

import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { NAV_ITEMS } from "@/constants/navigation.constants";
import { useAuthStore } from "@/store/auth.store";
import { Leaf } from "lucide-react";

function OrgLogo({ logoUrl }: { logoUrl: string | null | undefined }) {
  const [broken, setBroken] = React.useState(false);

  return (
    <div className="flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-accent text-accent-foreground">
      {logoUrl && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={logoUrl} // re-attempt when the url changes
          src={logoUrl}
          alt=""
          className="size-full object-contain"
          onError={() => setBroken(true)}
        />
      ) : (
        <Leaf className="size-4" />
      )}
    </div>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // Tenant branding — falls back to the product name until auth hydrates
  const organization = useAuthStore((s) => s.user?.organization);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<a href="/dashboard" />}>
              <OrgLogo logoUrl={organization?.logoUrl} />
              <div className="flex flex-1 items-center text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {organization?.name ?? "Beej Setu"}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={NAV_ITEMS} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
