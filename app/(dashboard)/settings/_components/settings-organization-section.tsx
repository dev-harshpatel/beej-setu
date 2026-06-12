"use client";

import { useAuthStore } from "@/store/auth.store";
import { ROLES } from "@/constants/roles.constants";
import { SettingsOrganizationForm } from "./settings-organization-form";

// Renders the whole card (not just the form) so non-super-admins
// get no empty card shell — the section simply doesn't exist for them.
export function SettingsOrganizationSection() {
  const role = useAuthStore((s) => s.user?.role);
  if (role !== ROLES.SUPER_ADMIN) return null;

  return (
    <section className="rounded-xl border border-border bg-card flex flex-col">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Organization</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Update your company name and logo.
        </p>
      </div>
      <div className="px-5 py-5">
        <SettingsOrganizationForm />
      </div>
    </section>
  );
}
