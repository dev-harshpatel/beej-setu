import apiClient from "@/lib/api-client";
import type { ApiResponse } from "@/types/common.types";
import type { ProfileRow } from "@/types/database.types";
import type {
  UpdateProfileFormValues,
  ChangePasswordFormValues,
} from "@/lib/validators/settings.validators";

interface UpdateProfileResponse {
  profile: ProfileRow;
  email: string | null;
}

export const settingsService = {
  async updateProfile(
    payload: UpdateProfileFormValues
  ): Promise<UpdateProfileResponse> {
    const { data } = await apiClient.patch<ApiResponse<UpdateProfileResponse>>(
      "/settings/profile",
      payload
    );
    return data.data;
  },

  async changePassword(
    payload: Omit<ChangePasswordFormValues, "confirmNewPassword">
  ): Promise<void> {
    await apiClient.patch("/settings/password", payload);
  },
};
