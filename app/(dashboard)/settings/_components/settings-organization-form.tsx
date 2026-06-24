"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2 } from "lucide-react";
import {
  updateOrganizationSchema,
  type UpdateOrganizationFormValues,
} from "@/lib/validators/organization.validators";
import { settingsService } from "@/services/settings.service";
import { getApiErrorMessage } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { LogoCropperDialog } from "./logo-cropper-dialog";
import { useLogoUpload } from "../_lib/use-logo-upload";
import type { Organization } from "@/types/auth.types";

export function SettingsOrganizationForm() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [logoBroken, setLogoBroken] = useState(false);

  const organization = user?.organization;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateOrganizationFormValues>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: {
      name: organization?.name ?? "",
      address: organization?.address ?? "",
      gstNumber: organization?.gstNumber ?? "",
      phone: organization?.phone ?? "",
      email: organization?.email ?? "",
      seedLicenceNumber: organization?.seedLicenceNumber ?? "",
    },
  });

  function applyOrganization(next: Organization, message: string) {
    if (user) setUser({ ...user, organization: next });
    setSuccess(message);
  }

  const {
    pendingImageSrc, logoBusy, fileInputRef,
    onPickFile, onCropped, onRemoveLogo, closeCropper,
  } = useLogoUpload({
    onApply: applyOrganization,
    onError: setServerError,
    onActionStart: () => { setServerError(null); setSuccess(null); },
  });

  async function onSubmit(values: UpdateOrganizationFormValues) {
    setServerError(null);
    setSuccess(null);
    try {
      const next = await settingsService.updateOrganization(values);
      applyOrganization(next, "Organization updated successfully.");
    } catch (err: unknown) {
      setServerError(getApiErrorMessage(err, "Failed to update organization"));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field>
          <FieldLabel>Logo</FieldLabel>
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-accent text-accent-foreground">
              {organization?.logoUrl && !logoBroken ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={organization.logoUrl}
                  src={organization.logoUrl}
                  alt=""
                  className="size-full object-contain"
                  onError={() => setLogoBroken(true)}
                />
              ) : (
                <Building2 className="size-5" />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={logoBusy}
                onClick={() => fileInputRef.current?.click()}
              >
                {organization?.logoUrl ? "Change logo" : "Upload logo"}
              </Button>
              {organization?.logoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={logoBusy}
                  onClick={onRemoveLogo}
                >
                  Remove
                </Button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              className="hidden"
              onChange={onPickFile}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            PNG, JPEG, WebP, GIF, or SVG up to 5 MB. You can crop and zoom before saving.
          </p>
        </Field>

        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="org-name">Company name</FieldLabel>
          <Input
            id="org-name"
            placeholder={organization?.name ?? "Company name"}
            autoComplete="organization"
            {...register("name")}
          />
          <FieldError errors={[errors.name]} />
          <p className="mt-1 text-xs text-muted-foreground">
            Shown in the sidebar for everyone in your company.
          </p>
        </Field>

        <Field data-invalid={!!errors.address}>
          <FieldLabel htmlFor="org-address">Address</FieldLabel>
          <Input
            id="org-address"
            placeholder="123, Industrial Estate Road, Near Bus Stand, Anytown"
            autoComplete="street-address"
            {...register("address")}
          />
          <FieldError errors={[errors.address]} />
          <p className="mt-1 text-xs text-muted-foreground">
            Printed on the delivery challan letterhead.
          </p>
        </Field>

        <Field data-invalid={!!errors.phone}>
          <FieldLabel htmlFor="org-phone">Phone</FieldLabel>
          <Input
            id="org-phone"
            placeholder="+91 98765 43210, +91 91234 56789"
            autoComplete="tel"
            {...register("phone")}
          />
          <FieldError errors={[errors.phone]} />
          <p className="mt-1 text-xs text-muted-foreground">
            Separate multiple numbers with a comma.
          </p>
        </Field>

        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="org-email">Email</FieldLabel>
          <Input
            id="org-email"
            type="email"
            placeholder="company@example.com"
            autoComplete="email"
            {...register("email")}
          />
          <FieldError errors={[errors.email]} />
        </Field>

        <Field data-invalid={!!errors.gstNumber}>
          <FieldLabel htmlFor="org-gst">GSTIN</FieldLabel>
          <Input
            id="org-gst"
            placeholder="22ABCDE1234F1Z5"
            className="font-mono"
            {...register("gstNumber")}
          />
          <FieldError errors={[errors.gstNumber]} />
        </Field>

        <Field data-invalid={!!errors.seedLicenceNumber}>
          <FieldLabel htmlFor="org-licence">Seed Licence No.</FieldLabel>
          <Input
            id="org-licence"
            placeholder="STX/LIC123456/2024-2025"
            className="font-mono"
            {...register("seedLicenceNumber")}
          />
          <FieldError errors={[errors.seedLicenceNumber]} />
        </Field>

        {serverError && (
          <div
            role="alert"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {serverError}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground"
          >
            {success}
          </div>
        )}
      </FieldGroup>

      <div className="mt-4">
        <Button type="submit" disabled={isSubmitting} size="sm">
          {isSubmitting ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      <LogoCropperDialog
        imageSrc={pendingImageSrc}
        onCancel={closeCropper}
        onCropped={onCropped}
      />
    </form>
  );
}
