"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { collectionsService } from "@/services/collections.service";
import type { ApiResponse } from "@/types/common.types";
import type { DealerRow } from "@/types/database.types";

export function useCollectionsData(userId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: dealerData } = useQuery({
    queryKey: ["dealers-for-collection"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<{ data: DealerRow[] }>>(
        "/dealers",
        { params: { pageSize: 200 } }
      );
      return data.data?.data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const { data: collections = [], isFetching } = useQuery({
    queryKey: ["collections", userId],
    queryFn: () => collectionsService.list(),
    enabled: !!userId,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["collections"] });
  }

  return {
    dealerOptions: (dealerData ?? []).map((d) => ({ value: d.id, label: d.name })),
    collections,
    loading: isFetching && collections.length === 0,
    invalidate,
  };
}
