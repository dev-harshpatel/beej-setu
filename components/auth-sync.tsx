"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth.store";

// Recovers the user profile from the active Supabase session when the
// Zustand store is hydrated but has no user (e.g. localStorage was cleared
// or the user arrived via a Supabase email link instead of the login form).
export function AuthSync() {
  const hydrated = useAuthStore((s) => s._hasHydrated);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const attempted = useRef(false);

  useEffect(() => {
    if (!hydrated || user || attempted.current) return;
    attempted.current = true;

    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) setUser(json.data);
      })
      .catch(() => {});
  }, [hydrated, user, setUser]);

  return null;
}
