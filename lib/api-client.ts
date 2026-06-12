import axios, { type AxiosInstance, type AxiosError } from "axios";
import { API_BASE_URL, API_TIMEOUT_MS, LOCAL_STORAGE_KEYS } from "@/constants/app.constants";
import type { ApiError } from "@/types/common.types";

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.USER);
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Extract a user-facing message from an apiClient (axios) error:
 * first zod field error if present, else the API envelope message, else fallback.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const e = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
  const data = e?.response?.data;
  const firstFieldError = data?.errors
    ? Object.values(data.errors)[0]?.[0]
    : undefined;
  return firstFieldError ?? data?.message ?? fallback;
}

export default apiClient;
