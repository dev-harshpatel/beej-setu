"use client";

import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { dealersService } from "@/services/dealers.service";
import { QUERY_KEYS } from "@/constants/query-keys";
import type { ApiResponse } from "@/types/common.types";
import type { ProfileRow } from "@/types/database.types";

interface UseDealersDataParams {
  status: string;
  territory: string;
  /** Staff dropdown list is only needed when the user can create/edit. */
  staffListEnabled: boolean;
}

export function useDealersData({ status, territory, staffListEnabled }: UseDealersDataParams) {
  const queryClient = useQueryClient();

  // Fetch a large page once; search + pagination happen client-side.
  const { data: dealersData, isFetching: dealersFetching } = useQuery({
    queryKey: [...QUERY_KEYS.DEALERS, { status, territory }],
    queryFn: () =>
      dealersService.getAll({
        page: 1,
        pageSize: 500,
        status: status || undefined,
        territory: territory || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const { data: staffListData } = useQuery({
    queryKey: ["staff-list"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<{ data: ProfileRow[] }>>(
        "/users",
        { params: { role: "STAFF", pageSize: 100 } }
      );
      return data.data?.data ?? [];
    },
    enabled: staffListEnabled,
    staleTime: 5 * 60_000,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DEALERS });
  }

  return {
    allDealers: dealersData?.data ?? [],
    loading: dealersFetching && !dealersData,
    staffList: staffListData ?? [],
    invalidate,
  };
}
