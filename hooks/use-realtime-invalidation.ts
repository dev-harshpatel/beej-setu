"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeContext } from "@/contexts/realtime-context";
import { QUERY_KEYS } from "@/constants/query-keys";

export function useRealtimeInvalidation() {
  const queryClient = useQueryClient();
  const { ordersVersion, dealersVersion, stockVersion, challansVersion } =
    useRealtimeContext();

  // Capture the mount-time values so we don't fire on the very first render.
  const initial = useRef({ ordersVersion, dealersVersion, stockVersion, challansVersion });

  useEffect(() => {
    if (ordersVersion === initial.current.ordersVersion) return;
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDERS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD_STATS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REPORTS });
  }, [ordersVersion, queryClient]);

  useEffect(() => {
    if (dealersVersion === initial.current.dealersVersion) return;
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DEALERS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD_STATS });
  }, [dealersVersion, queryClient]);

  useEffect(() => {
    if (stockVersion === initial.current.stockVersion) return;
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STOCK });
  }, [stockVersion, queryClient]);

  useEffect(() => {
    if (challansVersion === initial.current.challansVersion) return;
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHALLANS });
    // Challan creation updates order status — re-fetch orders too
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDERS });
  }, [challansVersion, queryClient]);
}

// Headless bridge component — mounted once inside Providers
export function RealtimeInvalidationBridge() {
  useRealtimeInvalidation();
  return null;
}
