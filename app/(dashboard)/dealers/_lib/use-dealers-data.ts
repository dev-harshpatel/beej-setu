"use client";

import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { dealersService } from "@/services/dealers.service";
import { QUERY_KEYS } from "@/constants/query-keys";
import type { ApiResponse } from "@/types/common.types";
import type { ProfileRow } from "@/types/database.types";

interface UseDealersDataParams {
  page: number;
  pageSize: number;
  search: string;
  status: string;
  territory: string;
  /** Staff dropdown list is only needed when the user can create/edit. */
  staffListEnabled: boolean;
}

export function useDealersData({
  page,
  pageSize,
  search,
  status,
  territory,
  staffListEnabled,
}: UseDealersDataParams) {
  const queryClient = useQueryClient();

  const { data: dealersData, isFetching: dealersFetching } = useQuery({
    queryKey: [...QUERY_KEYS.DEALERS, { page, pageSize, search, status, territory }],
    queryFn: () =>
      dealersService.getAll({
        page,
        pageSize,
        search: search || undefined,
        status: status || undefined,
        territory: territory || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const { data: territoriesData } = useQuery({
    queryKey: ["dealer-territories"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<string[]>>("/dealers/territories");
      return data.data ?? [];
    },
    staleTime: 10 * 60_000,
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
    queryClient.invalidateQueries({ queryKey: ["dealer-territories"] });
  }

  return {
    dealers: dealersData?.data ?? [],
    total: dealersData?.total ?? 0,
    loading: dealersFetching && !dealersData,
    territories: territoriesData ?? [],
    staffList: staffListData ?? [],
    invalidate,
  };
}
