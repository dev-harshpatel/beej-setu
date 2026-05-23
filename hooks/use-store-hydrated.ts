"use client";

import { useAuthStore } from "@/store/auth.store";

export function useStoreHydrated() {
  return useAuthStore((s) => s._hasHydrated);
}
