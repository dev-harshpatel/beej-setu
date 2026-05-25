export const ROLES = {
  SUPER_ADMIN:    "SUPER_ADMIN",
  ADMIN:          "ADMIN",
  STAFF:          "STAFF",
  DISPATCH_STAFF: "DISPATCH_STAFF",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  // Orders
  ORDERS_VIEW:   "orders:view",
  ORDERS_CREATE: "orders:create",
  ORDERS_EDIT:   "orders:edit",
  ORDERS_DELETE: "orders:delete",

  // Dealers
  DEALERS_VIEW:   "dealers:view",
  DEALERS_CREATE: "dealers:create",
  DEALERS_EDIT:   "dealers:edit",
  DEALERS_DELETE: "dealers:delete",

  // Seeds
  SEEDS_VIEW:   "seeds:view",
  SEEDS_CREATE: "seeds:create",
  SEEDS_EDIT:   "seeds:edit",
  SEEDS_DELETE: "seeds:delete",

  // Users
  USERS_VIEW:   "users:view",
  USERS_CREATE: "users:create",
  USERS_EDIT:   "users:edit",
  USERS_DELETE: "users:delete",

  // Stock
  STOCK_VIEW:   "stock:view",
  STOCK_MANAGE: "stock:manage",

  // Reports
  REPORTS_VIEW: "reports:view",

  // Settings
  SETTINGS_VIEW: "settings:view",
  SETTINGS_EDIT: "settings:edit",

  // Dashboard (hidden from dispatch staff)
  DASHBOARD_VIEW: "dashboard:view",

  // Challans — exclusive to dispatch staff (and admins)
  CHALLAN_MANAGE: "challan:manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL_PERMISSIONS = Object.values(PERMISSIONS) as Permission[];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.SUPER_ADMIN]: ALL_PERMISSIONS,
  [ROLES.ADMIN]:       ALL_PERMISSIONS,
  [ROLES.STAFF]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_CREATE,
    PERMISSIONS.ORDERS_EDIT,
    PERMISSIONS.DEALERS_VIEW,
    PERMISSIONS.SEEDS_VIEW,
  ],
  [ROLES.DISPATCH_STAFF]: [
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.CHALLAN_MANAGE,
  ],
};

export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.SUPER_ADMIN]:    "Super Admin",
  [ROLES.ADMIN]:          "Admin",
  [ROLES.STAFF]:          "Staff",
  [ROLES.DISPATCH_STAFF]: "Dispatch Staff",
};
