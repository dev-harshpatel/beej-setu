import apiClient from "@/lib/api-client";
import type { ApiResponse, PaginatedResponse } from "@/types/common.types";
import type { User } from "@/types/auth.types";
import type { CreateUserFormValues } from "@/lib/validators/users.validators";

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
};
