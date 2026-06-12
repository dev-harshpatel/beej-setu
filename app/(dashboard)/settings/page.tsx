import type { Metadata } from "next";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { SettingsProfileForm } from "./_components/settings-profile-form";
import { SettingsPasswordForm } from "./_components/settings-password-form";
import { SettingsOrganizationSection } from "./_components/settings-organization-section";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        />
        <h1 className="text-sm font-medium">Settings</h1>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account credentials.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 max-w-4xl">
          <section className="rounded-xl border border-border bg-card flex flex-col">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Profile</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Update your email address or username.
              </p>
            </div>
            <div className="px-5 py-5">
              <SettingsProfileForm />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card flex flex-col">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Password</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Change your account password.
              </p>
            </div>
            <div className="px-5 py-5">
              <SettingsPasswordForm />
            </div>
          </section>

          <SettingsOrganizationSection />
        </div>
      </div>
    </>
  );
}
