import apiClient, { getApiErrorMessage } from "@/lib/api-client";
import type { ApiResponse } from "@/types/common.types";
import type { ChallanRow } from "@/types/database.types";

export interface GodownDispatchPayload {
  orderId: string;
  challanNumber: string;
  transportName?: string;
  godownDispatchDate: string;
}

export interface TransportDispatchPayload {
  transportDispatchDate: string;
  lrNumber?: string;
  transportName?: string;
}

export const challanService = {
  async getChallan(orderId: string): Promise<ChallanRow | null> {
    try {
      const { data } = await apiClient.get<ApiResponse<ChallanRow>>(`/challans/${orderId}`);
      return data.data ?? null;
    } catch {
      return null;
    }
  },

  async dispatchGodown(payload: GodownDispatchPayload): Promise<ChallanRow> {
    try {
      const { data } = await apiClient.post<ApiResponse<ChallanRow>>("/challans", {
        order_id:             payload.orderId,
        challan_number:       payload.challanNumber,
        transport_name:       payload.transportName ?? null,
        godown_dispatch_date: payload.godownDispatchDate,
      });
      return data.data;
    } catch (err) {
      throw new Error(getApiErrorMessage(err, "Failed to save challan."));
    }
  },

  async getChallanPdfBlob(orderId: string): Promise<Blob> {
    try {
      const { data } = await apiClient.get<Blob>(`/challans/${orderId}/pdf`, {
        responseType: "blob",
      });
      return data;
    } catch (err) {
      throw new Error(getApiErrorMessage(err, "Failed to generate challan PDF."));
    }
  },

  async dispatchTransport(orderId: string, payload: TransportDispatchPayload): Promise<ChallanRow> {
    try {
      const { data } = await apiClient.patch<ApiResponse<ChallanRow>>(`/challans/${orderId}`, {
        transport_dispatch_date: payload.transportDispatchDate,
        lr_number:               payload.lrNumber ?? null,
        transport_name:          payload.transportName ?? null,
      });
      return data.data;
    } catch (err) {
      throw new Error(getApiErrorMessage(err, "Failed to update dispatch."));
    }
  },
};
