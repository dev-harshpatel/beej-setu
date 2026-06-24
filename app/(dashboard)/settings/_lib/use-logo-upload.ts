"use client";

import { useRef, useState } from "react";
import { settingsService } from "@/services/settings.service";
import { getApiErrorMessage } from "@/lib/api-client";
import type { Organization } from "@/types/auth.types";

interface UseLogoUploadOptions {
  /** Called with the updated organization after a successful upload/remove. */
  onApply: (org: Organization, message: string) => void;
  onError: (message: string) => void;
  /** Clear any success/error banners before a new pick or remove starts. */
  onActionStart: () => void;
}

/**
 * File-pick → crop → upload lifecycle for the organization logo.
 * Object URL of the picked image is created on pick and revoked on close.
 * Lifecycle lives in event handlers (not effects) on purpose: see LogoCropperDialog.
 */
export function useLogoUpload({ onApply, onError, onActionStart }: UseLogoUploadOptions) {
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function closeCropper() {
    setPendingImageSrc((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"].includes(file.type)) {
      onError("Logo must be a PNG, JPEG, WebP, GIF, or SVG image");
      return;
    }
    onActionStart();

    // SVGs are vector — cropping them to a raster doesn't make sense, so
    // upload the original file as-is and skip the cropper entirely.
    if (file.type === "image/svg+xml") {
      void uploadLogo(file);
      return;
    }

    closeCropper(); // revoke any previous pick
    setPendingImageSrc(URL.createObjectURL(file));
  }

  async function uploadLogo(blob: Blob) {
    setLogoBusy(true);
    try {
      const next = await settingsService.uploadOrganizationLogo(blob);
      onApply(next, "Logo updated successfully.");
    } catch (err: unknown) {
      onError(getApiErrorMessage(err, "Failed to upload logo"));
    } finally {
      closeCropper();
      setLogoBusy(false);
    }
  }

  async function onCropped(blob: Blob) {
    await uploadLogo(blob);
  }

  async function onRemoveLogo() {
    onActionStart();
    setLogoBusy(true);
    try {
      const next = await settingsService.removeOrganizationLogo();
      onApply(next, "Logo removed.");
    } catch (err: unknown) {
      onError(getApiErrorMessage(err, "Failed to remove logo"));
    } finally {
      setLogoBusy(false);
    }
  }

  return { pendingImageSrc, logoBusy, fileInputRef, onPickFile, onCropped, onRemoveLogo, closeCropper };
}
