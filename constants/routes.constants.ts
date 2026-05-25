export const ROUTES = {
  ROOT: "/",

  AUTH: {
    LOGIN: "/login",
    FORGOT_PASSWORD: "/forgot-password",
    RESET_PASSWORD: "/reset-password",
  },

  DASHBOARD: {
    ROOT: "/dashboard",
    HOME: "/dashboard",
  },

  ORDERS: {
    ROOT: "/orders",
    CREATE: "/orders/create",
    DETAIL: (id: string) => `/orders/${id}`,
    EDIT: (id: string) => `/orders/${id}/edit`,
  },

  DEALERS: {
    ROOT: "/dealers",
    CREATE: "/dealers/create",
    DETAIL: (id: string) => `/dealers/${id}`,
    EDIT: (id: string) => `/dealers/${id}/edit`,
  },

  SEEDS: {
    ROOT: "/seeds",
    CREATE: "/seeds/create",
    DETAIL: (id: string) => `/seeds/${id}`,
    EDIT: (id: string) => `/seeds/${id}/edit`,
  },

  USERS: {
    ROOT: "/users",
    CREATE: "/users/create",
    DETAIL: (id: string) => `/users/${id}`,
    EDIT: (id: string) => `/users/${id}/edit`,
  },

  STOCK: {
    ROOT:   "/stock",
    LEDGER: "/stock/ledger",
  },

  REPORTS: {
    ROOT: "/reports",
    DEALER: "/reports/dealer",
    PRODUCT: "/reports/product",
  },

  SETTINGS: {
    ROOT: "/settings",
  },
} as const;

export const PUBLIC_ROUTES: string[] = [
  ROUTES.AUTH.LOGIN,
  ROUTES.AUTH.FORGOT_PASSWORD,
  ROUTES.AUTH.RESET_PASSWORD,
];
