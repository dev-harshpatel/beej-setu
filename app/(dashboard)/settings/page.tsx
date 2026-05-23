import type { Metadata } from "next";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { SettingsProfileForm } from "./_components/settings-profile-form";
import { SettingsPasswordForm } from "./_components/settings-password-form";

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

      <div className="flex flex-1 flex-col gap-8 p-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account credentials.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:max-w-3xl">
          <section className="flex flex-col gap-4">
            <div>
              <h3 className="text-base font-semibold">Profile</h3>
              <p className="text-sm text-muted-foreground">
                Update your email address or username.
              </p>
            </div>
            <Separator />
            <SettingsProfileForm />
          </section>

          <section className="flex flex-col gap-4">
            <div>
              <h3 className="text-base font-semibold">Password</h3>
              <p className="text-sm text-muted-foreground">
                Change your account password.
              </p>
            </div>
            <Separator />
            <SettingsPasswordForm />
          </section>
        </div>
      </div>
    </>
  );
}
