import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { AuthSync } from "@/components/auth-sync";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AuthSync />
      <AppSidebar />
      <SidebarInset className="min-h-0 overflow-hidden">{children}</SidebarInset>
    </SidebarProvider>
  );
}
