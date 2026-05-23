"use client";

import { useEffect } from "react";
import { useUsersStore } from "@/store/users.store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ProfileRow } from "@/types/database.types";

export function useUsersRealtime() {
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const { initialized, setUsers, setLoading, setInitialized, upsertUser, removeUser } =
      useUsersStore.getState();

    if (!initialized) {
      setLoading(true);
      supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          setUsers((data as ProfileRow[]) ?? []);
          setInitialized(true);
          setLoading(false);
        });
    }

    const channel = supabase
      .channel("profiles-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            upsertUser(payload.new as ProfileRow);
          } else if (payload.eventType === "DELETE") {
            removeUser((payload.old as { id: string }).id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
