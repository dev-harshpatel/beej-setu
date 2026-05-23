"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UsersTable } from "./users-table";
import { AddUserDialog } from "./add-user-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useUsersRealtime } from "@/hooks/use-users-realtime";
import { ROLES } from "@/constants/roles.constants";

export function UserTabs() {
  const { user } = useAuth();
  useUsersRealtime();

  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;

  const adminTabRoles = isSuperAdmin
    ? [ROLES.ADMIN, ROLES.SUPER_ADMIN]
    : [ROLES.ADMIN];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Users</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your team members
          </p>
        </div>
        <AddUserDialog onSuccess={() => {}} />
      </div>

      <Tabs defaultValue="staff">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="staff">Staff Users</TabsTrigger>
          <TabsTrigger value="admins">Admin Users</TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="mt-4">
          <UsersTable roles={[ROLES.STAFF]} />
        </TabsContent>

        <TabsContent value="admins" className="mt-4">
          <UsersTable roles={adminTabRoles} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
