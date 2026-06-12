import apiClient from "@/lib/api-client";
import type { ApiResponse } from "@/types/common.types";
import type { DealerWithStaffRow } from "@/lib/database/dealers.queries";
import type {
  CreateDealerFormValues,
  UpdateDealerFormValues,
} from "@/lib/validators/dealers.validators";

export interface DealersListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  territory?: string;
  staffId?: string;
}

export const dealersService = {
  async getAll(
    params: DealersListParams
  ): Promise<{ data: DealerWithStaffRow[]; total: number }> {
    const { data } = await apiClient.get<
      ApiResponse<{ data: DealerWithStaffRow[]; total: number }>
    >("/dealers", { params });
    return data.data;
  },

  async create(payload: CreateDealerFormValues): Promise<DealerWithStaffRow> {
    const { data } = await apiClient.post<ApiResponse<DealerWithStaffRow>>(
      "/dealers",
      payload
    );
    return data.data;
  },

  async update(
    id: string,
    payload: UpdateDealerFormValues
  ): Promise<DealerWithStaffRow> {
    const { data } = await apiClient.patch<ApiResponse<DealerWithStaffRow>>(
      `/dealers/${id}`,
      payload
    );
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/dealers/${id}`);
  },

  async bulkDelete(ids: string[]): Promise<void> {
    await apiClient.post("/dealers/bulk-delete", { ids });
  },
};
