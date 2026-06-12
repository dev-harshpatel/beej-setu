import apiClient from "@/lib/api-client";
import type { ApiResponse } from "@/types/common.types";
import type { CollectionWithRelations } from "@/lib/database/collections.queries";
import type { PaymentMode } from "@/types/database.types";

export interface CreateCollectionPayload {
  dealerId: string;
  paymentMode: PaymentMode;
  amount: number;
  collectionDate: string;
  notes?: string;
}

export interface UpdateCollectionPayload {
  paymentMode?: PaymentMode;
  amount?: number;
  collectionDate?: string;
  notes?: string | null;
}

export const collectionsService = {
  async list(): Promise<CollectionWithRelations[]> {
    const { data } = await apiClient.get<ApiResponse<CollectionWithRelations[]>>(
      "/collections"
    );
    return data.data ?? [];
  },

  async create(payload: CreateCollectionPayload): Promise<void> {
    await apiClient.post("/collections", payload);
  },

  async update(id: string, payload: UpdateCollectionPayload): Promise<void> {
    await apiClient.patch(`/collections/${id}`, payload);
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/collections/${id}`);
  },
};
