import apiClient from "@/lib/api-client";
import type { ApiResponse, PaginatedResponse } from "@/types/common.types";
import type { User } from "@/types/auth.types";
import type { ProfileRow } from "@/types/database.types";
import type { CreateUserFormValues } from "@/lib/validators/users.validators";

export interface UpdateUserPayload {
  name?: string;
  phone?: string | null;
  role?: string;
  isActive?: boolean;
  profileImage?: string | null;
  territory?: string | null;
}

export const usersService = {
  async list(params?: {
    role?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<User>> {
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<User>>>(
      "/users",
      { params }
    );
    return data.data;
  },

  async create(payload: CreateUserFormValues): Promise<User> {
    const { data } = await apiClient.post<ApiResponse<User>>("/users", payload);
    return data.data;
  },

  async update(id: string, payload: UpdateUserPayload): Promise<ProfileRow> {
    const { data } = await apiClient.patch<ApiResponse<ProfileRow>>(
      `/users/${id}`,
      payload
    );
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  },

  async bulkDelete(ids: string[]): Promise<void> {
    await apiClient.post("/users/bulk-delete", { ids });
  },

  async changePassword(id: string, newPassword: string): Promise<void> {
    await apiClient.patch(`/users/${id}/password`, { newPassword });
  },

  async getCurrentPassword(id: string): Promise<string> {
    const { data } = await apiClient.get<ApiResponse<{ password: string }>>(
      `/users/${id}/password`
    );
    return data.data.password;
  },
};
