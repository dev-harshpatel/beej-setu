"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import type { OrderWithRelations } from "@/types/order.types";
import type { OrderStatusValue } from "@/constants/order-status.constants";

interface UseOrdersDataParams {
  page: number;
  pageSize: number;
  resolvedStatus: OrderStatusValue | undefined;
  resolvedStatuses: OrderStatusValue[] | undefined;
  dealerId: string;
  staffId: string;
  dateFrom: string;
  dateTo: string;
}

export function useOrdersData({
  page,
  pageSize,
  resolvedStatus,
  resolvedStatuses,
  dealerId,
  staffId,
  dateFrom,
  dateTo,
}: UseOrdersDataParams) {
  const queryClient = useQueryClient();
  const manualRefresh = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isFetching } = useQuery({
    queryKey: [
      ...QUERY_KEYS.ORDERS,
      { page, pageSize, status: resolvedStatus, statuses: resolvedStatuses, dealerId, staffId, dateFrom, dateTo },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (resolvedStatuses)    params.set("statuses", resolvedStatuses.join(","));
      else if (resolvedStatus) params.set("status", resolvedStatus);
      if (dealerId)  params.set("dealerId", dealerId);
      if (staffId)   params.set("staffId", staffId);
      if (dateFrom)  params.set("dateFrom", dateFrom);
      if (dateTo)    params.set("dateTo", dateTo);
      const res  = await fetch(`/api/orders?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error("Failed to fetch orders");
      return json.data as { data: OrderWithRelations[]; total: number };
    },
    placeholderData: keepPreviousData,
  });

  // Clear the spinner only when the manual-triggered fetch completes
  useEffect(() => {
    if (!isFetching && manualRefresh.current) {
      manualRefresh.current = false;
      setIsRefreshing(false);
    }
  }, [isFetching]);

  function invalidateOrders() {
    manualRefresh.current = true;
    setIsRefreshing(true);
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDERS });
  }

  return {
    orders:    data?.data ?? [],
    total:     data?.total ?? 0,
    loading:   isFetching && !data,
    isRefreshing,
    invalidateOrders,
  };
}
