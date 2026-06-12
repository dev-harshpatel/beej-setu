"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";

export function useStoreHydrated() {
  // Primary: subscribe to _hasHydrated in the store (works for normal navigations).
  const storeHydrated = useAuthStore((s) => s._hasHydrated);

  // Fallback: use Zustand's internal persist flag.
  // If the store subscription misses the update (can happen with React 19 +
  // Next.js concurrent navigation), this effect picks it up via onFinishHydration.
  const [persistHydrated, setPersistHydrated] = useState(false);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setPersistHydrated(true);
      return;
    }
    const unsub = useAuthStore.persist.onFinishHydration(() => setPersistHydrated(true));
    // Re-check after subscribing in case hydration completed between render and effect
    if (useAuthStore.persist.hasHydrated()) setPersistHydrated(true);
    return unsub;
  }, []);

  return storeHydrated || persistHydrated;
}
