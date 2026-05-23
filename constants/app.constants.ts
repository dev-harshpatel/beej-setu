export const APP_NAME = "Beej Setu" as const;
export const APP_DESCRIPTION = "Seed Order Management System" as const;
export const APP_VERSION = "1.0.0" as const;

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";
export const API_TIMEOUT_MS = 30_000;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

export const DATE_FORMAT = "dd/MM/yyyy" as const;
export const DATETIME_FORMAT = "dd/MM/yyyy HH:mm" as const;

export const LOCAL_STORAGE_KEYS = {
  AUTH_TOKEN: "bs_auth_token",
  REFRESH_TOKEN: "bs_refresh_token",
  USER: "bs_user",
} as const;

export const SESSION_STORAGE_KEYS = {
  REDIRECT_URL: "bs_redirect_url",
} as const;
