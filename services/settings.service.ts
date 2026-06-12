import apiClient from "@/lib/api-client";
import type { ApiResponse } from "@/types/common.types";
import type { ProfileRow } from "@/types/database.types";
import type { Organization } from "@/types/auth.types";
import type {
  UpdateProfileFormValues,
  ChangePasswordFormValues,
} from "@/lib/validators/settings.validators";
import type { UpdateOrganizationFormValues } from "@/lib/validators/organization.validators";

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

  async updateOrganization(
    payload: UpdateOrganizationFormValues
  ): Promise<Organization> {
    const { data } = await apiClient.patch<ApiResponse<Organization>>(
      "/settings/organization",
      payload
    );
    return data.data;
  },

  async uploadOrganizationLogo(blob: Blob): Promise<Organization> {
    const formData = new FormData();
    formData.append("file", blob, "logo.png");
    const { data } = await apiClient.post<ApiResponse<Organization>>(
      "/settings/organization/logo",
      formData,
      // apiClient defaults to application/json — that breaks multipart
      // parsing server-side. Let axios set the boundary itself.
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data.data;
  },

  async removeOrganizationLogo(): Promise<Organization> {
    const { data } = await apiClient.delete<ApiResponse<Organization>>(
      "/settings/organization/logo"
    );
    return data.data;
  },
};
