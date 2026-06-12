"use client";

import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/constants/roles.constants";
import { QUERY_KEYS } from "@/constants/query-keys";
import { STOCK_FETCH_SIZE } from "./stock.config";
import type { SeedStockWithDetails } from "@/lib/database/stock.queries";
import type { SeedProductWithCropRow } from "@/lib/database/seeds.queries";
import type { CropRow } from "@/types/database.types";

interface UseStockDataParams {
  cropId: string;
}

export function useStockData({ cropId }: UseStockDataParams) {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.STOCK_MANAGE);
  const queryClient = useQueryClient();

  // Large fetch once — search/pagination happen client-side.
  const { data: stockData, isFetching: stockFetching, refetch: refetchStock } = useQuery({
    queryKey: [...QUERY_KEYS.STOCK, { cropId }],
    queryFn: async () => {
      const params = new URLSearchParams({ pageSize: String(STOCK_FETCH_SIZE) });
      if (cropId) params.set("cropId", cropId);
      const res  = await fetch(`/api/stock?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error("Failed to fetch stock");
      return json.data as { data: SeedStockWithDetails[]; total: number };
    },
    placeholderData: keepPreviousData,
  });

  const { data: crops = [] } = useQuery<CropRow[]>({
    queryKey: ["crops"],
    queryFn: async () => {
      const res  = await fetch("/api/crops");
      const json = await res.json();
      return (json.data ?? []) as CropRow[];
    },
    staleTime: 10 * 60_000,
  });

  const { data: products = [] } = useQuery<SeedProductWithCropRow[]>({
    queryKey: ["seed-products-list"],
    queryFn: async () => {
      const res  = await fetch("/api/seeds?pageSize=200");
      const json = await res.json();
      return (json.data?.data ?? []) as SeedProductWithCropRow[];
    },
    enabled: canManage,
    staleTime: 5 * 60_000,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STOCK });
  }

  return {
    allRows:     stockData?.data ?? [] as SeedStockWithDetails[],
    loading:     stockFetching && !stockData,
    isRefreshing: stockFetching && !!stockData,
    crops,
    products,
    canManage,
    refetchStock,
    invalidate,
  };
}
