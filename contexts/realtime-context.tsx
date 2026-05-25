"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

// ─── Version counters ─────────────────────────────────────────────────────────
// Each counter increments whenever ANY change lands on that table.
// Components never read the counter directly — the invalidation bridge
// watches it and calls queryClient.invalidateQueries() instead.

interface RealtimeContextValue {
  ordersVersion:  number;
  dealersVersion: number;
  stockVersion:   number;
  challansVersion: number;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  ordersVersion:  0,
  dealersVersion: 0,
  stockVersion:   0,
  challansVersion: 0,
});

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [ordersVersion,  setOrdersVersion]  = useState(0);
  const [dealersVersion, setDealersVersion] = useState(0);
  const [stockVersion,   setStockVersion]   = useState(0);
  const [challansVersion, setChallansVersion] = useState(0);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // orders + order_items share one channel — both bump the orders counter
    const ordersChannel = supabase
      .channel("rt:orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () =>
        setOrdersVersion((v) => v + 1),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () =>
        setOrdersVersion((v) => v + 1),
      )
      .subscribe();

    const dealersChannel = supabase
      .channel("rt:dealers")
      .on("postgres_changes", { event: "*", schema: "public", table: "dealers" }, () =>
        setDealersVersion((v) => v + 1),
      )
      .subscribe();

    const stockChannel = supabase
      .channel("rt:stock")
      .on("postgres_changes", { event: "*", schema: "public", table: "seed_stock" }, () =>
        setStockVersion((v) => v + 1),
      )
      .subscribe();

    const challansChannel = supabase
      .channel("rt:challans")
      .on("postgres_changes", { event: "*", schema: "public", table: "challans" }, () => {
        setChallansVersion((v) => v + 1);
        // challan creation changes the order status too
        setOrdersVersion((v) => v + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(dealersChannel);
      supabase.removeChannel(stockChannel);
      supabase.removeChannel(challansChannel);
    };
  }, []);

  const value = useMemo(
    () => ({ ordersVersion, dealersVersion, stockVersion, challansVersion }),
    [ordersVersion, dealersVersion, stockVersion, challansVersion],
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeContext() {
  return useContext(RealtimeContext);
}
