import apiClient from "@/lib/api-client";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types/common.types";
import type {
  Order,
  CreateOrderPayload,
  UpdateOrderPayload,
  OrderStatus,
} from "@/types/order.types";

export const orderService = {
  async getOrders(
    params?: PaginationParams & { status?: OrderStatus; dealerId?: string }
  ): Promise<PaginatedResponse<Order>> {
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<Order>>>(
      "/orders",
      { params }
    );
    return data.data;
  },

  async getOrderById(id: string): Promise<Order> {
    const { data } = await apiClient.get<ApiResponse<Order>>(`/orders/${id}`);
    return data.data;
  },

  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    const { data } = await apiClient.post<ApiResponse<Order>>(
      "/orders",
      payload
    );
    return data.data;
  },

  async updateOrder(id: string, payload: UpdateOrderPayload): Promise<Order> {
    const { data } = await apiClient.patch<ApiResponse<Order>>(
      `/orders/${id}`,
      payload
    );
    return data.data;
  },

  async deleteOrder(id: string): Promise<void> {
    await apiClient.delete(`/orders/${id}`);
  },

  async updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
    const { data } = await apiClient.patch<ApiResponse<Order>>(
      `/orders/${id}/status`,
      { status }
    );
    return data.data;
  },
};
