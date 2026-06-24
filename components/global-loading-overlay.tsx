"use client";

import { useLoaderStore } from "@/store/loader.store";
import { BoxesLoader } from "@/components/ui/boxes-loader";

export function GlobalLoadingOverlay() {
  const isLoading = useLoaderStore((s) => s.isLoading);
  const message   = useLoaderStore((s) => s.message);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-background/70 backdrop-blur-sm">
      <BoxesLoader />
      {message && <p className="text-sm font-medium text-foreground">{message}</p>}
    </div>
  );
}
