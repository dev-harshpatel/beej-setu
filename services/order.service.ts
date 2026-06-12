import apiClient, { getApiErrorMessage } from "@/lib/api-client";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types/common.types";
import type {
  Order,
  CreateOrderPayload,
  UpdateOrderPayload,
  OrderStatus,
  OrderWithRelations,
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
    const { data } = await apiClient.post<ApiResponse<Order>>("/orders", payload);
    return data.data;
  },

  async updateOrder(id: string, payload: UpdateOrderPayload): Promise<Order> {
    const { data } = await apiClient.patch<ApiResponse<Order>>(`/orders/${id}`, payload);
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

  // ── Extended methods used by admin orders UI ────────────────

  async updateStatus(
    id: string,
    status: OrderStatus,
    options?: {
      itemBatches?: { itemId: string; batchNumber: string }[];
      partialReason?: string;
    }
  ): Promise<OrderWithRelations> {
    try {
      const body: Record<string, unknown> = { status };
      if (options?.itemBatches?.length)  body.itemBatches  = options.itemBatches;
      if (options?.partialReason)        body.partial_reason = options.partialReason;
      const { data } = await apiClient.patch<ApiResponse<OrderWithRelations>>(
        `/orders/${id}/status`,
        body
      );
      return data.data;
    } catch (err) {
      throw new Error(getApiErrorMessage(err, "Status update failed"));
    }
  },

  async updateWithItems(
    id: string,
    fields: { notes?: string; deliveryDate?: string },
    itemEdits?: Record<string, { quantity: number; unit: string }>
  ): Promise<OrderWithRelations> {
    try {
      const body: Record<string, unknown> = {};
      if (fields.notes !== undefined) body.notes = fields.notes;
      if (fields.deliveryDate)        body.deliveryDate = fields.deliveryDate;
      if (itemEdits && Object.keys(itemEdits).length > 0) {
        body.items = Object.entries(itemEdits).map(([itemId, { quantity, unit }]) => ({
          id: itemId, quantity, unit,
        }));
      }
      const { data } = await apiClient.patch<ApiResponse<OrderWithRelations>>(
        `/orders/${id}`,
        body
      );
      return data.data;
    } catch (err) {
      throw new Error(getApiErrorMessage(err, "Update failed"));
    }
  },

  async fulfillRemaining(id: string): Promise<OrderWithRelations> {
    try {
      const { data } = await apiClient.post<ApiResponse<OrderWithRelations>>(
        `/orders/${id}/fulfill-remaining`
      );
      return data.data;
    } catch (err) {
      throw new Error(getApiErrorMessage(err, "Failed to fulfill remaining"));
    }
  },
};
